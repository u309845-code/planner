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

export interface DayTaskRow {
  key: string
  title: string
  tags: string[]
  seconds: number
}

export interface DayBreakdown {
  total: number
  byTask: DayTaskRow[]
  byTag: { tag: string | null; seconds: number }[]
}

/** Сколько времени и на что ушло в календарный день, начинающийся в `day`. */
export function dayBreakdown(
  entries: TimeEntry[],
  tasks: Task[],
  now: number,
  day: number,
): DayBreakdown {
  const from = dayStart(day)
  const to = addDays(from, 1)
  const byTask = new Map<string, DayTaskRow>()
  const byTag = new Map<string | null, number>()
  let total = 0

  for (const s of spans(entries, tasks, now)) {
    const seconds = Math.round(overlapMs(s.start, s.end, from, to) / 1000)
    if (seconds <= 0) continue
    total += seconds
    const current = tasks.find((t) => t.id === s.taskId)
    const key = s.taskId ?? `title:${s.title}`
    const row = byTask.get(key) ?? {
      key,
      title: current?.title ?? s.title,
      tags: current?.tags ?? s.tags,
      seconds: 0,
    }
    row.seconds += seconds
    byTask.set(key, row)
    for (const tag of s.tags.length ? s.tags : [null]) {
      byTag.set(tag, (byTag.get(tag) ?? 0) + seconds)
    }
  }

  return {
    total,
    byTask: [...byTask.values()].sort((a, b) => b.seconds - a.seconds),
    byTag: [...byTag.entries()]
      .map(([tag, seconds]) => ({ tag, seconds }))
      .sort((a, b) => b.seconds - a.seconds),
  }
}

/** Время по дням для одной задачи (новые дни первыми). */
export function taskDays(
  entries: TimeEntry[],
  tasks: Task[],
  taskId: string,
  now: number,
): { day: number; seconds: number }[] {
  const perDay = new Map<number, number>()
  for (const s of spans(entries, tasks, now)) {
    if (s.taskId !== taskId) continue
    for (let d = dayStart(s.start); d < s.end; d = addDays(d, 1)) {
      const sec = Math.round(overlapMs(s.start, s.end, d, addDays(d, 1)) / 1000)
      if (sec > 0) perDay.set(d, (perDay.get(d) ?? 0) + sec)
    }
  }
  return [...perDay.entries()].map(([day, seconds]) => ({ day, seconds })).sort((a, b) => b.day - a.day)
}
