import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushState =
  | 'unsupported' // браузер не умеет пуши
  | 'needs-install' // iPhone: сначала нужно добавить на экран «Домой»
  | 'denied' // пользователь запретил уведомления
  | 'off' // можно включить
  | 'on' // включены на этом устройстве

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** Регистрирует служебный скрипт; вызывается один раз при запуске приложения. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
    // без скрипта пуши недоступны, остальное приложение работает
  })
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function getPushState(): Promise<PushState> {
  if (isIos() && !isStandalone()) return 'needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

/** Просит разрешение, подписывает устройство и сохраняет подписку в базе. */
export async function enablePush(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) throw new Error('Не задан ключ уведомлений (VITE_VAPID_PUBLIC_KEY)')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Уведомления не разрешены в настройках браузера')

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('Не удалось получить данные подписки')
  }
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Показывает уведомление прямо с устройства (проверка, что браузер их выводит). */
export async function showTestNotification(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Planner', {
    body: 'Так будут выглядеть напоминания о задачах.',
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    tag: 'test',
  })
}

export interface ReminderSettings {
  remindBeforeMin: number[]
}

export async function loadReminderSettings(): Promise<ReminderSettings> {
  const { data } = await supabase.from('user_settings').select('remind_before_min').maybeSingle()
  return { remindBeforeMin: (data?.remind_before_min as number[] | undefined) ?? [60] }
}

export async function saveReminderSettings(offsets: number[]): Promise<void> {
  const { error } = await supabase.from('user_settings').upsert({
    remind_before_min: offsets,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}
