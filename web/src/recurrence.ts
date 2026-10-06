import { DAY, fromDateKey, toDateKey } from './dates'
import { addDays, dayStart } from './stats'
import type { Recurrence, Task } from './types'

const mon0 = (ms: number) => (new Date(ms).getDay() + 6) % 7

/** Первый подходящий день строго после `ref` (все даты — полночь по местному времени). */
function nextDay(rule: Recurrence, baseDay: number, ref: number): number {
  switch (rule.freq) {
    case 'daily':
      return addDays(ref, 1)
    case 'weekdays': {
      let d = addDays(ref, 1)
      while (mon0(d) >= 5) d = addDays(d, 1)
      return d
    }
    case 'weekly': {
      const days = rule.days.length ? rule.days : [mon0(baseDay)]
      let d = addDays(ref, 1)
      for (let i = 0; i < 7 && !days.includes(mon0(d)); i++) d = addDays(d, 1)
      return d
    }
    case 'monthly': {
      const dom = new Date(baseDay).getDate()
      const r = new Date(ref)
      let y = r.getFullYear()
      let m = r.getMonth()
      for (;;) {
        const inMonth = new Date(y, m + 1, 0).getDate()
        const candidate = new Date(y, m, Math.min(dom, inMonth)).getTime()
        if (candidate > ref) return candidate
        m++
        if (m > 11) {
          m = 0
          y++
        }
      }
    }
  }
}

export interface NextDates {
  dueAt: string | null
  planDate: string | null
}

/**
 * Даты следующего повтора. Считается от дедлайна (или дня в плане), но не раньше
 * сегодняшнего дня: просроченная ежедневная задача не порождает вчерашние копии.
 * Время суток дедлайна сохраняется, расстояние между днём в плане и дедлайном тоже.
 */
export function nextOccurrence(task: Task, rule: Recurrence, now: number): NextDates {
  const today = dayStart(now)
  const base = task.dueAt
    ? dayStart(new Date(task.dueAt).getTime())
    : task.planDate
      ? fromDateKey(task.planDate)
      : today
  const next = nextDay(rule, base, Math.max(base, today))

  let dueAt: string | null = null
  if (task.dueAt) {
    const original = new Date(task.dueAt)
    const d = new Date(next)
    d.setHours(original.getHours(), original.getMinutes(), 0, 0)
    dueAt = d.toISOString()
  }

  let planDate: string | null = null
  if (task.planDate) {
    if (task.dueAt) {
      const offset = Math.round(
        (dayStart(new Date(task.dueAt).getTime()) - fromDateKey(task.planDate)) / DAY,
      )
      planDate = toDateKey(Math.max(addDays(next, -Math.max(0, offset)), today))
    } else {
      planDate = toDateKey(next)
    }
  }
  return { dueAt, planDate }
}

const DAY_NAMES = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

export function describeRecurrence(rule: Recurrence): string {
  switch (rule.freq) {
    case 'daily':
      return 'каждый день'
    case 'weekdays':
      return 'по будням'
    case 'weekly':
      return rule.days.length ? `каждую неделю: ${[...rule.days].sort().map((d) => DAY_NAMES[d]).join(', ')}` : 'каждую неделю'
    case 'monthly':
      return 'каждый месяц'
  }
}
