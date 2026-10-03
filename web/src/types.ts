export interface Task {
  id: string
  title: string
  notes: string
  /** ISO-строка в UTC или null, если срока нет */
  dueAt: string | null
  done: boolean
  createdAt: string
}

export type NewTask = Pick<Task, 'title' | 'notes' | 'dueAt'>
