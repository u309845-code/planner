export type Kind = 'task' | 'note'
export type Priority = 0 | 1 | 2

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

/** Правило повтора. Для weekly дни недели: 0 = понедельник … 6 = воскресенье. */
export type Recurrence =
  | { freq: 'daily' }
  | { freq: 'weekdays' }
  | { freq: 'weekly'; days: number[] }
  | { freq: 'monthly' }

export interface Task {
  id: string
  title: string
  notes: string
  /** Дедлайн: ISO-строка в UTC или null */
  dueAt: string | null
  /** День в плане: локальная дата «ГГГГ-ММ-ДД» или null (отдельно от дедлайна) */
  planDate: string | null
  done: boolean
  doneAt: string | null
  kind: Kind
  tags: string[]
  priority: Priority
  /** План времени, минуты */
  plannedMin: number | null
  /** Накопленный факт, секунды (без текущего запуска таймера) */
  spentSec: number
  /** Когда запущен таймер; null, если не идёт */
  timerStartedAt: string | null
  checklist: ChecklistItem[]
  /** Правило повтора; null — задача не повторяется */
  recurrence: Recurrence | null
  createdAt: string
}

export interface NewTask {
  title: string
  notes?: string
  dueAt?: string | null
  planDate?: string | null
  kind?: Kind
  tags?: string[]
  priority?: Priority
  plannedMin?: number | null
  checklist?: ChecklistItem[]
  recurrence?: Recurrence | null
}

export type Patch = Partial<Omit<Task, 'id' | 'createdAt'>>

/** Один запуск таймера. Название и теги скопированы из задачи на момент записи. */
export interface TimeEntry {
  id: string
  taskId: string | null
  title: string
  tags: string[]
  startedAt: string
  endedAt: string
  seconds: number
}
