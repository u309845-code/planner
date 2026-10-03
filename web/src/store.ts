import { useCallback, useEffect, useState } from 'react'
import { totalSpentSec } from './dates'
import { supabase } from './supabase'
import type { NewTask, Patch, Priority, Task } from './types'

const LOCAL_KEY = 'planner.tasks.v1'

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

let importing: Promise<void> | null = null

/** Переносит задачи, созданные до входа (хранились в браузере), в облако. */
function importLocal(): Promise<void> {
  // повторный вызов (например, двойной запуск эффекта в StrictMode) ждёт первый
  importing ??= doImport().finally(() => {
    importing = null
  })
  return importing
}

async function doImport(): Promise<void> {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(LOCAL_KEY)
    const local = raw ? (JSON.parse(raw) as { title: string; notes: string; dueAt: string | null; done: boolean; createdAt: string }[]) : []
    if (local.length === 0) return
    // очищаем до отправки, чтобы параллельный запуск не создал дубли
    localStorage.removeItem(LOCAL_KEY)
    const { error } = await supabase.from('tasks').insert(
      local.map((t) => ({
        title: t.title,
        notes: t.notes,
        due_at: t.dueAt,
        done: t.done,
        created_at: t.createdAt,
      })),
    )
    if (error && raw) localStorage.setItem(LOCAL_KEY, raw)
  } catch {
    // нет доступа к localStorage или битые данные — просто пропускаем
  }
}

/** Задачи текущего пользователя в Supabase (доступ ограничен правилами RLS). */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
      return
    }
    setTasks((data as Row[]).map(fromRow))
    setError(null)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      await importLocal()
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

  const add = useCallback(async (t: NewTask) => {
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
    if (error) return setError(error.message)
    setTasks((prev) => [fromRow(data as Row), ...prev])
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

  const toggle = useCallback(
    (id: string) => {
      const t = tasks.find((x) => x.id === id)
      if (!t) return
      const done = !t.done
      const p: Patch = { done, doneAt: done ? new Date().toISOString() : null }
      if (done && t.timerStartedAt) {
        p.spentSec = totalSpentSec(t, Date.now())
        p.timerStartedAt = null
      }
      void patch(id, p)
    },
    [tasks, patch],
  )

  const pauseTimer = useCallback(
    (id: string) => {
      const t = tasks.find((x) => x.id === id)
      if (!t?.timerStartedAt) return
      void patch(id, { spentSec: totalSpentSec(t, Date.now()), timerStartedAt: null })
    },
    [tasks, patch],
  )

  /** Запускает таймер; идущий на другой задаче ставит на паузу. */
  const startTimer = useCallback(
    (id: string) => {
      for (const t of tasks) {
        if (t.timerStartedAt && t.id !== id) {
          void patch(t.id, { spentSec: totalSpentSec(t, Date.now()), timerStartedAt: null })
        }
      }
      void patch(id, { timerStartedAt: new Date().toISOString() })
    },
    [tasks, patch],
  )

  return { tasks, loading, error, add, patch, remove, toggle, startTimer, pauseTimer }
}
