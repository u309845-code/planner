// Облачная функция Supabase: раз в минуту (по расписанию pg_cron) находит задачи,
// у которых подошло время напоминания, и отправляет пуш на устройства владельца.
//
// Секреты (Supabase -> Edge Functions -> Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
// SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY Supabase подставляет сам.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const MINUTE = 60_000
/** Напоминание отправляем, только если его время наступило не более 10 минут назад. */
const WINDOW_MS = 10 * MINUTE
/** Самое раннее напоминание — за сутки; берём задачи с запасом. */
const HORIZON_MS = 25 * 60 * MINUTE
const DEFAULT_OFFSETS = [60]

interface TaskRow {
  id: string
  user_id: string
  title: string
  due_at: string
}

function messageFor(offset: number, dueAt: string, tz: string | null): string {
  if (offset === 0) return 'Срок наступил'
  if (offset === 15) return 'Срок через 15 минут'
  if (offset === 60) return 'Срок через час'
  if (offset === 1440) {
    const time = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz ?? 'UTC',
    }).format(new Date(dueAt))
    return `Срок завтра в ${time}`
  }
  return `Срок через ${offset} мин`
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('forbidden', { status: 403 })
  }

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const now = Date.now()
  const { data: tasks, error } = await db
    .from('tasks')
    .select('id,user_id,title,due_at')
    .eq('kind', 'task')
    .eq('done', false)
    .not('due_at', 'is', null)
    .gte('due_at', new Date(now - WINDOW_MS).toISOString())
    .lte('due_at', new Date(now + HORIZON_MS).toISOString())
  if (error) return new Response(error.message, { status: 500 })
  if (!tasks || tasks.length === 0) return Response.json({ checked: 0, sent: 0 })

  const userIds = [...new Set((tasks as TaskRow[]).map((t) => t.user_id))]
  const [settings, subs] = await Promise.all([
    db.from('user_settings').select('user_id,remind_before_min,tz').in('user_id', userIds),
    db.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', userIds),
  ])
  const settingsByUser = new Map((settings.data ?? []).map((s) => [s.user_id as string, s]))
  const subsByUser = new Map<string, NonNullable<typeof subs.data>>()
  for (const s of subs.data ?? []) {
    const list = subsByUser.get(s.user_id as string) ?? []
    list.push(s)
    subsByUser.set(s.user_id as string, list)
  }

  let sent = 0
  for (const task of tasks as TaskRow[]) {
    const userSubs = subsByUser.get(task.user_id) ?? []
    if (userSubs.length === 0) continue
    const cfg = settingsByUser.get(task.user_id)
    const offsets: number[] = cfg?.remind_before_min ?? DEFAULT_OFFSETS
    const dueMs = new Date(task.due_at).getTime()

    for (const offset of offsets) {
      const fireAt = dueMs - offset * MINUTE
      if (fireAt > now || now - fireAt > WINDOW_MS) continue

      // сначала помечаем как отправленное: при повторном запуске дубля не будет
      const { error: markError } = await db
        .from('reminders_sent')
        .insert({ task_id: task.id, due_at: task.due_at, offset_min: offset })
      if (markError) continue

      const payload = JSON.stringify({
        title: task.title,
        body: messageFor(offset, task.due_at, cfg?.tz ?? null),
        tag: `${task.id}-${offset}`,
        url: './',
      })
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          sent++
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          // устройство отписалось или подписка устарела — удаляем её
          if (status === 404 || status === 410) {
            await db.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }
    }
  }

  return Response.json({ checked: tasks.length, sent })
})
