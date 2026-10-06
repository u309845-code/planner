import type { Task } from './types'

const HOUR = 3_600_000
export const DAY = 24 * HOUR

export type Bucket = 'hot' | 'soon' | 'later' | 'none'

/** hot — до дедлайна ≤ 1 дня (включая просроченные); soon — ≤ 3 дней. */
export function bucketOf(t: Task, now: number): Bucket {
  if (t.done || t.kind !== 'task' || !t.dueAt) return 'none'
  const diff = new Date(t.dueAt).getTime() - now
  if (diff <= DAY) return 'hot'
  if (diff <= 3 * DAY) return 'soon'
  return 'later'
}

export function byDue(a: Task, b: Task): number {
  if (a.dueAt === b.dueAt) return 0
  if (!a.dueAt) return 1
  if (!b.dueAt) return -1
  return a.dueAt.localeCompare(b.dueAt)
}

/** Полночь дня, в который попадает `ms` */
export function dayStartMs(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function isSameDay(iso: string, ms: number): boolean {
  const a = new Date(iso)
  const b = new Date(ms)
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatDue(iso: string, now: number): string {
  const d = new Date(iso)
  const t = new Date(now)
  const startToday = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
  const startDue = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startDue - startToday) / DAY)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (days === 0) return `сегодня ${time}`
  if (days === 1) return `завтра ${time}`
  if (days === -1) return `вчера ${time}`
  const date = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${date} ${time}`
}

/** 90 → «1 ч 30 мин» */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h} ч ${m} мин`
  if (h) return `${h} ч`
  return `${m} мин`
}

/** Затраченное время: «<1 мин», «25 мин», «1 ч 20 мин» */
export function formatSpent(sec: number): string {
  if (sec <= 0) return '0 мин'
  if (sec < 60) return '<1 мин'
  return formatMinutes(Math.floor(sec / 60))
}

export function formatDayLabel(dayMs: number, now: number): string {
  const d = new Date(dayMs)
  const t = new Date(now)
  const days = Math.round(
    (new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      DAY,
  )
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** Секунды, прошедшие с запуска таймера (0, если не запущен) */
export function runningSec(t: Task, now: number): number {
  return t.timerStartedAt
    ? Math.max(0, Math.floor((now - new Date(t.timerStartedAt).getTime()) / 1000))
    : 0
}

export const totalSpentSec = (t: Task, now: number): number => t.spentSec + runningSec(t, now)

/** Локальная дата «ГГГГ-ММ-ДД» (для поля «день в плане») */
export function toDateKey(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** «ГГГГ-ММ-ДД» → полночь этого дня по местному времени */
export function fromDateKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** Понедельник недели, в которую попадает `ms` (полночь) */
export function weekStart(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

/** ISO (UTC) → значение для <input type="datetime-local"> */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function localInputToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}
