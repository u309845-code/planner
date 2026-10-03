import { useCallback, useEffect, useState } from 'react'
import { runningSec, totalSpentSec } from './dates'
import { supabase } from './supabase'
import type { NewTask, Patch, Priority, Task, TimeEntry } from './types'

interface Row {
  id: string
  title: string
  notes: string
  due_at: string | null
  done: boolean
  done_at: string | null
  kind: 'task' | 'note'
  tags: string[] | null
  priority: number
  planned_min: number | null
  spent_sec: number
  timer_started_at: string | null
  created_at: string
}

interface EntryRow {
  id: string
  task_id: string | null
  task_title: string
  tags: string[] | null
  started_at: string
  ended_at: string
  seconds: number
}

const fromRow = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  dueAt: r.due_at,
  done: r.done,
  doneAt: r.done_at,
  kind: r.kind,
  tags: r.tags ?? [],
  priority: (r.priority as Priority) ?? 0,
  plannedMin: r.planned_min,
  spentSec: r.spent_sec,
  timerStartedAt: r.timer_started_at,
  createdAt: r.created_at,
})

const entryFromRow = (r: EntryRow): TimeEntry => ({
  id: r.id,
  taskId: r.task_id,
  title: r.task_title,
  tags: r.tags ?? [],
  startedAt: r.started_at,
  endedAt: r.ended_at,
  seconds: r.seconds,
})

function toRow(p: Patch): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (p.title !== undefined) row.title = p.title
  if (p.notes !== undefined) row.notes = p.notes
  if (p.dueAt !== undefined) row.due_at = p.dueAt
  if (p.done !== undefined) row.done = p.done
  if (p.doneAt !== undefined) row.done_at = p.doneAt
  if (p.kind !== undefined) row.kind = p.kind
  if (p.tags !== undefined) row.tags = p.tags
  if (p.priority !== undefined) row.priority = p.priority
  if (p.plannedMin !== undefined) row.planned_min = p.plannedMin
  if (p.spentSec !== undefined) row.spent_sec = p.spentSec
  if (p.timerStartedAt !== undefined) row.timer_started_at = p.timerStartedAt
  return row
}

/** Задачи и журнал времени текущего пользователя (доступ ограничен правилами RLS). */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [t, e] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('time_entries').select('*').order('started_at', { ascending: false }),
    ])
    const failure = t.error ?? e.error
    if (failure) {
      setError(failure.message)
      return
    }
    setTasks((t.data as Row[]).map(fromRow))
    setEntries((e.data as EntryRow[]).map(entryFromRow))
    setError(null)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      await refresh()
      if (active) setLoading(false)
    })()
    // подтягиваем изменения, сделанные на другом устройстве
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const add = useCallback(async (t: NewTask): Promise<Task | undefined> => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: t.title,
        notes: t.notes ?? '',
        due_at: t.dueAt ?? null,
        kind: t.kind ?? 'task',
        tags: t.tags ?? [],
        priority: t.priority ?? 0,
        planned_min: t.plannedMin ?? null,
      })
      .select()
      .single()
    if (error) {
      setError(error.message)
      return undefined
    }
    const task = fromRow(data as Row)
    setTasks((prev) => [task, ...prev])
    return task
  }, [])

  const patch = useCallback(
    async (id: string, p: Patch) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...p } : t)))
      const { error } = await supabase.from('tasks').update(toRow(p)).eq('id', id)
      if (error) {
        setError(error.message)
        void refresh()
      }
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) {
        setError(error.message)
        void refresh()
      }
    },
    [refresh],
  )

  /** Записывает завершённый запуск таймера в журнал времени. */
  const recordEntry = useCallback(async (t: Task, endMs: number) => {
    const seconds = runningSec(t, endMs)
    if (!t.timerStartedAt || seconds < 1) return
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        task_id: t.id,
        task_title: t.title,
        tags: t.tags,
        started_at: t.timerStartedAt,
        ended_at: new Date(endMs).toISOString(),
        seconds,
      })
      .select()
      .single()
    if (error) return setError(error.message)
    setEntries((prev) => [entryFromRow(data as EntryRow), ...prev])
  }, [])

  /** Останавливает таймер: пишет запуск в журнал и копит время в задаче. */
  const stopTimer = useCallback(
    (t: Task, extra: Patch = {}) => {
      const nowMs = Date.now()
      void recordEntry(t, nowMs)
      void patch(t.id, { spentSec: totalSpentSec(t, nowMs), timerStartedAt: null, ...extra })
    },
    [recordEntry, patch],
  )

  const pauseTimer = useCallback(
    (id: string) => {
      const t = tasks.find((x) => x.id === id)
      if (t?.timerStartedAt) stopTimer(t)
    },
    [tasks, stopTimer],
  )

  /** Остановить таймер (если идёт) и отметить задачу выполненной. */
  const finishTask = useCallback(
    (id: string) => {
      const t = tasks.find((x) => x.id === id)
      if (!t) return
      const done = { done: true, doneAt: new Date().toISOString() }
      if (t.timerStartedAt) stopTimer(t, done)
      else void patch(id, done)
    },
    [tasks, stopTimer, patch],
  )

  const toggle = useCallback(
    (id: string) => {
      const t = tasks.find((x) => x.id === id)
      if (!t) return
      if (t.done) void patch(id, { done: false, doneAt: null })
      else finishTask(id)
    },
    [tasks, patch, finishTask],
  )

  /** Запускает таймер; идущий на другой задаче ставит на паузу. */
  const startTimer = useCallback(
    (id: string) => {
      for (const t of tasks) {
        if (t.timerStartedAt && t.id !== id) stopTimer(t)
      }
      void patch(id, { timerStartedAt: new Date().toISOString() })
    },
    [tasks, stopTimer, patch],
  )

  return {
    tasks,
    entries,
    loading,
    error,
    add,
    patch,
    remove,
    toggle,
    finishTask,
    startTimer,
    pauseTimer,
  }
}
