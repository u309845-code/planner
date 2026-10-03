import type { Task, TimeEntry } from './types'

export function dayStart(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function addDays(ms: number, n: number): number {
  const d = new Date(ms)
  d.setDate(d.getDate() + n)
  return d.getTime()
}

const overlapMs = (a0: number, a1: number, b0: number, b1: number) =>
  Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))

interface Span {
  taskId: string | null
  title: string
  tags: string[]
  start: number
  end: number
}

/** Записанные запуски + идущие сейчас таймеры (до текущего момента). */
function spans(entries: TimeEntry[], tasks: Task[], now: number): Span[] {
  const result: Span[] = entries.map((e) => ({
    taskId: e.taskId,
    title: e.title,
    tags: e.tags,
    start: new Date(e.startedAt).getTime(),
    end: new Date(e.endedAt).getTime(),
  }))
  for (const t of tasks) {
    if (t.timerStartedAt) {
      result.push({
        taskId: t.id,
        title: t.title,
        tags: t.tags,
        start: new Date(t.timerStartedAt).getTime(),
        end: now,
      })
    }
  }
  return result
}

/** Время одной задачи в один календарный день. */
export interface UsageRow {
  day: number
  key: string
  taskId: string | null
  title: string
  tags: string[]
  seconds: number
}

/**
 * Разбивает все запуски таймера по дням. Период: [from, to) — границы в мс,
 * обе — начало суток. Запуск через полночь делится между днями.
 */
export function usageRows(
  entries: TimeEntry[],
  tasks: Task[],
  now: number,
  from: number,
  to: number,
): UsageRow[] {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const rows = new Map<string, UsageRow>()
  for (const s of spans(entries, tasks, now)) {
    for (let d = dayStart(Math.max(s.start, from)); d < to && d < s.end; d = addDays(d, 1)) {
      const seconds = Math.round(overlapMs(s.start, s.end, d, addDays(d, 1)) / 1000)
      if (seconds <= 0) continue
      const key = s.taskId ?? `title:${s.title}`
      const id = `${d}|${key}`
      const current = s.taskId ? byId.get(s.taskId) : undefined
      const row = rows.get(id) ?? {
        day: d,
        key,
        taskId: s.taskId,
        title: current?.title ?? s.title,
        tags: current?.tags ?? s.tags,
        seconds: 0,
      }
      row.seconds += seconds
      rows.set(id, row)
    }
  }
  return [...rows.values()].sort((a, b) => a.day - b.day || b.seconds - a.seconds)
}

export interface Breakdown {
  total: number
  byTask: { key: string; title: string; tags: string[]; seconds: number }[]
  byTag: { tag: string | null; seconds: number }[]
  /** Секунды по дням (ключ — начало суток) */
  byDay: Map<number, number>
}

export function aggregate(rows: UsageRow[]): Breakdown {
  const byTask = new Map<string, Breakdown['byTask'][number]>()
  const byTag = new Map<string | null, number>()
  const byDay = new Map<number, number>()
  let total = 0
  for (const r of rows) {
    total += r.seconds
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.seconds)
    const task = byTask.get(r.key) ?? { key: r.key, title: r.title, tags: r.tags, seconds: 0 }
    task.seconds += r.seconds
    byTask.set(r.key, task)
    for (const tag of r.tags.length ? r.tags : [null]) {
      byTag.set(tag, (byTag.get(tag) ?? 0) + r.seconds)
    }
  }
  return {
    total,
    byTask: [...byTask.values()].sort((a, b) => b.seconds - a.seconds),
    byTag: [...byTag.entries()]
      .map(([tag, seconds]) => ({ tag, seconds }))
      .sort((a, b) => b.seconds - a.seconds),
    byDay,
  }
}

/** Сколько времени и на что ушло в календарный день, начинающийся в `day`. */
export function dayBreakdown(
  entries: TimeEntry[],
  tasks: Task[],
  now: number,
  day: number,
): Breakdown {
  const from = dayStart(day)
  return aggregate(usageRows(entries, tasks, now, from, addDays(from, 1)))
}

/** Время по дням для одной задачи (новые дни первыми). */
export function taskDays(
  entries: TimeEntry[],
  tasks: Task[],
  taskId: string,
  now: number,
): { day: number; seconds: number }[] {
  return usageRows(entries, tasks, now, 0, addDays(dayStart(now), 1))
    .filter((r) => r.taskId === taskId)
    .map((r) => ({ day: r.day, seconds: r.seconds }))
    .sort((a, b) => b.day - a.day)
}
