import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import Auth from './Auth'
import { supabase } from './supabase'
import { useTasks } from './store'
import type { Task } from './types'

type Tab = 'today' | 'soon' | 'all' | 'done'

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Сегодня' },
  { id: 'soon', label: 'Скоро' },
  { id: 'all', label: 'Все' },
  { id: 'done', label: 'Готово' },
]

const EMPTY: Record<Tab, string> = {
  today: 'На сегодня задач нет',
  soon: 'Ближайших задач нет',
  all: 'Задач пока нет — добавьте первую',
  done: 'Выполненных задач пока нет',
}

function endOfToday(): number {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

function byDue(a: Task, b: Task): number {
  if (a.dueAt === b.dueAt) return 0
  if (!a.dueAt) return 1
  if (!b.dueAt) return -1
  return a.dueAt.localeCompare(b.dueAt)
}

function formatDue(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Значение для <input type="datetime-local"> → ISO (UTC) */
function localToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

export default function App() {
  // undefined — ещё проверяем сессию, null — не вошли
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (session === null) return <Auth />
  return <Planner email={session.user.email ?? ''} />
}

function Planner({ email }: { email: string }) {
  const { tasks, loading, error, add, toggle, remove } = useTasks()
  const [tab, setTab] = useState<Tab>('today')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [due, setDue] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const visible = useMemo(() => {
    const end = endOfToday()
    const open = tasks.filter((t) => !t.done)
    switch (tab) {
      case 'today':
        return open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() <= end).sort(byDue)
      case 'soon':
        return open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() > end).sort(byDue)
      case 'all':
        return open.sort(byDue)
      case 'done':
        return tasks.filter((t) => t.done)
    }
  }, [tasks, tab])

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    add({ title: trimmed, notes: notes.trim(), dueAt: localToIso(due) })
    setTitle('')
    setNotes('')
    setDue('')
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pb-16 pt-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Планер</h1>
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
          <span className="truncate">{email}</span>
          <button
            onClick={() => void supabase.auth.signOut()}
            className="shrink-0 rounded-md px-2 py-1 ring-1 ring-slate-300 hover:text-slate-800 dark:ring-slate-700 dark:hover:text-slate-200"
          >
            Выйти
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          Ошибка: {error}
        </p>
      )}

      <form
        onSubmit={submit}
        className="mb-5 space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Что нужно сделать?"
          className="w-full rounded-lg bg-transparent px-2 py-2 text-base outline-none placeholder:text-slate-400"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Заметка (необязательно)"
          rows={2}
          className="w-full resize-none rounded-lg bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-slate-100 px-2 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            Добавить
          </button>
        </div>
      </form>

      <nav className="mb-4 flex gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-white shadow-sm dark:bg-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">Загрузка…</p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">{EMPTY[tab]}</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => {
            const overdue = !t.done && t.dueAt !== null && new Date(t.dueAt).getTime() < now
            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggle(t.id)}
                  aria-label="Выполнено"
                  className="mt-1 size-5 shrink-0 accent-indigo-600"
                />
                <div className="min-w-0 flex-1">
                  <p className={`break-words ${t.done ? 'text-slate-400 line-through' : ''}`}>
                    {t.title}
                  </p>
                  {t.notes && (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-500">
                      {t.notes}
                    </p>
                  )}
                  {t.dueAt && (
                    <p
                      className={`mt-1 text-xs ${overdue ? 'font-medium text-red-500' : 'text-slate-400'}`}
                    >
                      {overdue ? 'Просрочено · ' : ''}
                      {formatDue(t.dueAt)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Удалить"
                  className="shrink-0 rounded-md px-2 text-lg leading-none text-slate-400 hover:text-red-500"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
