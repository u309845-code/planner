import { useCallback, useEffect, useState } from 'react'
import type { NewTask, Task } from './types'

const KEY = 'planner.tasks.v1'

function load(): Task[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Task[]) : []
  } catch {
    return []
  }
}

function save(tasks: Task[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks))
  } catch {
    // хранилище недоступно (приватный режим) — работаем только в памяти
  }
}

/**
 * Хранилище задач. Сейчас — localStorage; интерфейс хука не зависит от
 * хранилища, поэтому позже его можно заменить на Supabase без правок UI.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(load)

  useEffect(() => save(tasks), [tasks])

  const add = useCallback((t: NewTask) => {
    setTasks((prev) => [
      {
        ...t,
        id: crypto.randomUUID(),
        done: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
  }, [])

  const toggle = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }, [])

  const remove = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { tasks, add, toggle, remove }
}
