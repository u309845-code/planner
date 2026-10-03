import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { NewTask, Task } from './types'

const LOCAL_KEY = 'planner.tasks.v1'

interface Row {
  id: string
  title: string
  notes: string
  due_at: string | null
  done: boolean
  created_at: string
}

const fromRow = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  dueAt: r.due_at,
  done: r.done,
  createdAt: r.created_at,
})

/** Переносит задачи, созданные до входа (хранились в браузере), в облако. */
let importing: Promise<void> | null = null

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
    const local = raw ? (JSON.parse(raw) as Task[]) : []
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
      .insert({ title: t.title, notes: t.notes, due_at: t.dueAt })
      .select()
      .single()
    if (error) return setError(error.message)
    setTasks((prev) => [fromRow(data as Row), ...prev])
  }, [])

  const toggle = useCallback(
    async (id: string) => {
      const current = tasks.find((t) => t.id === id)
      if (!current) return
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
      const { error } = await supabase.from('tasks').update({ done: !current.done }).eq('id', id)
      if (error) {
        setError(error.message)
        void refresh()
      }
    },
    [tasks, refresh],
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

  return { tasks, loading, error, add, toggle, remove }
}
