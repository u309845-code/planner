import { byDue, toDateKey } from './dates'
import type { Task } from './types'

/** Задачи, поставленные в план на этот день (невыполненные первыми). */
export function plannedOn(tasks: Task[], key: string): Task[] {
  return tasks
    .filter((t) => t.planDate === key)
    .sort((a, b) => Number(a.done) - Number(b.done) || byDue(a, b))
}

/** Невыполненные задачи, у которых дедлайн в этот день, а запланированы они на другой. */
export function deadlinesOn(tasks: Task[], key: string): Task[] {
  return tasks.filter(
    (t) =>
      !t.done && t.dueAt && t.planDate !== key && toDateKey(new Date(t.dueAt).getTime()) === key,
  )
}
