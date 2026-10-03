import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Flame, Clock, Plus } from 'lucide-react'
import Auth from './Auth'
import EditDialog from './components/EditDialog'
import Sidebar, { type View } from './components/Sidebar'
import TaskRow from './components/TaskRow'
import TimerPanel from './components/TimerPanel'
import { bucketOf, byDue, endOfDay, formatDue, isSameDay } from './dates'
import { useNow, useTheme } from './hooks'
import { parseQuick } from './quickAdd'
import { supabase } from './supabase'
import { useTasks } from './store'
import type { Kind, Task } from './types'

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

const TITLES: Record<View, string> = {
  today: 'Сегодня',
  hot: 'Горит',
  soon: 'Скоро',
  inbox: 'Входящие',
  notes: 'Заметки',
  done: 'Выполнено',
}

const EMPTY: Record<View, string> = {
  today: 'На сегодня ничего нет. Добавьте задачу или отдохните.',
  hot: 'Ничего не горит. Хорошая новость.',
  soon: 'В ближайшие три дня дедлайнов нет.',
  inbox: 'Входящие пусты: у всех задач есть срок.',
  notes: 'Заметок пока нет.',
  done: 'Выполненных задач пока нет.',
}

function Planner({ email }: { email: string }) {
  const { tasks, loading, error, add, patch, remove, toggle, startTimer, pauseTimer } = useTasks()
  const running = tasks.find((t) => t.timerStartedAt !== null)
  const now = useNow(running ? 1000 : 30_000)
  const { theme, toggle: toggleTheme } = useTheme()

  const [view, setView] = useState<View>('today')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [kind, setKind] = useState<Kind>('task')

  const editing = tasks.find((t) => t.id === editingId)

  const data = useMemo(() => {
    const matches = (t: Task) => tagFilter.every((g) => t.tags.includes(g))
    const allOpen = tasks.filter((t) => t.kind === 'task' && !t.done)
    const counts = {
      hot: allOpen.filter((t) => bucketOf(t, now) === 'hot').length,
      soon: allOpen.filter((t) => bucketOf(t, now) === 'soon').length,
      inbox: allOpen.filter((t) => !t.dueAt).length,
    }
    const open = allOpen.filter(matches)
    const end = endOfDay(now)
    const hot = open.filter((t) => bucketOf(t, now) === 'hot').sort(byDue)
    const soon = open.filter((t) => bucketOf(t, now) === 'soon').sort(byDue)
    const todayOpen = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() <= end).sort(byDue)
    const todayDone = tasks.filter(
      (t) => t.kind === 'task' && t.done && t.doneAt && isSameDay(t.doneAt, now) && matches(t),
    )
    return {
      counts,
      hot,
      soon,
      todayOpen,
      todayDone,
      inbox: open.filter((t) => !t.dueAt),
      notes: tasks.filter((t) => t.kind === 'note' && matches(t)),
      done: tasks
        .filter((t) => t.kind === 'task' && t.done && matches(t))
        .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')),
    }
  }, [tasks, tagFilter, now])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    void add(parseQuick(text, kind, tagFilter))
    setText('')
  }

  const toggleTag = (id: string) =>
    setTagFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const rows = (items: Task[]) => (
    <ul>
      {items.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          now={now}
          onToggle={toggle}
          onEdit={setEditingId}
          onStart={startTimer}
          onPause={pauseTimer}
        />
      ))}
    </ul>
  )

  const list = view === 'today' ? [...data.todayOpen, ...data.todayDone] : data[view]
  const doneToday = data.todayDone.length
  const totalToday = data.todayOpen.length + doneToday

  return (
    <div className="mx-auto grid min-h-dvh max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[210px_minmax(0,1fr)_240px] lg:gap-6">
      <Sidebar
        view={view}
        onView={setView}
        counts={data.counts}
        tagFilter={tagFilter}
        onTag={toggleTag}
        email={email}
        theme={theme}
        onTheme={toggleTheme}
        onSignOut={() => void supabase.auth.signOut()}
      />

      <main className="min-w-0 lg:py-6">
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
            Ошибка: {error}
          </p>
        )}

        <form
          onSubmit={submit}
          className="mb-4 flex items-center gap-2 rounded-2xl bg-white p-2 pl-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-800"
        >
          <Plus size={18} className="shrink-0 text-slate-400" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              kind === 'task'
                ? 'Что нужно сделать? Например: КП для Клиента-А до пт 15:00 #клиент ~1ч'
                : 'Мысль или заметка'
            }
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-slate-400"
          />
          <div className="flex shrink-0 rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
            {(['task', 'note'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md px-2.5 py-1 transition ${
                  kind === k ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'
                }`}
              >
                {k === 'task' ? 'Задача' : 'Заметка'}
              </button>
            ))}
          </div>
        </form>

        {view === 'today' && (data.hot.length > 0 || data.soon.length > 0) && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <DeadlineCard
              title="Горит · до 1 дня"
              icon={<Flame size={15} />}
              tone="hot"
              items={data.hot}
              now={now}
              onOpen={() => setView('hot')}
              onEdit={setEditingId}
            />
            <DeadlineCard
              title="Скоро · до 3 дней"
              icon={<Clock size={15} />}
              tone="soon"
              items={data.soon}
              now={now}
              onOpen={() => setView('soon')}
              onEdit={setEditingId}
            />
          </div>
        )}

        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">
            {view === 'today' ? 'Фокус на сегодня' : TITLES[view]}
          </h2>
          {view === 'today' && totalToday > 0 && (
            <span className="text-sm text-slate-500">
              сделано {doneToday} из {totalToday}
            </span>
          )}
        </div>
        {view === 'today' && totalToday > 0 && (
          <div className="mb-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.round((doneToday / totalToday) * 100)}%` }}
            />
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">Загрузка…</p>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">{EMPTY[view]}</p>
        ) : (
          <div className="rounded-2xl bg-white px-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            {rows(list)}
          </div>
        )}
      </main>

      <div className="lg:py-6">
        <div className="lg:sticky lg:top-6">
          <TimerPanel task={running} now={now} onPause={pauseTimer} />
        </div>
      </div>

      {editing && (
        <EditDialog
          key={editing.id}
          task={editing}
          onSave={(id, p) => void patch(id, p)}
          onDelete={(id) => void remove(id)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}

function DeadlineCard({
  title,
  icon,
  tone,
  items,
  now,
  onOpen,
  onEdit,
}: {
  title: string
  icon: React.ReactNode
  tone: 'hot' | 'soon'
  items: Task[]
  now: number
  onOpen: () => void
  onEdit: (id: string) => void
}) {
  const style =
    tone === 'hot'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
  return (
    <div className={`rounded-2xl border p-3 ${style}`}>
      <button onClick={onOpen} className="mb-1 flex items-center gap-1.5 text-sm font-medium">
        {icon} {title}
        <span className="ml-1 text-xs opacity-70">{items.length}</span>
      </button>
      {items.length === 0 ? (
        <p className="py-1 text-sm opacity-70">Пусто</p>
      ) : (
        items.slice(0, 3).map((t) => (
          <button
            key={t.id}
            onClick={() => onEdit(t.id)}
            className="flex w-full items-center gap-2 border-t border-current/15 py-1.5 text-left text-sm first:border-t-0"
          >
            <span className="flex-1 truncate text-slate-900 dark:text-slate-100">{t.title}</span>
            <span className="shrink-0 text-xs">{t.dueAt && formatDue(t.dueAt, now)}</span>
          </button>
        ))
      )}
    </div>
  )
}
