import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Clock, Flame, Plus } from 'lucide-react'
import Auth from './Auth'
import NotesView from './components/NotesView'
import ReportsView from './components/ReportsView'
import Sidebar, { type View } from './components/Sidebar'
import TaskDialog, { type TaskForm } from './components/TaskDialog'
import TaskRow from './components/TaskRow'
import TimeView from './components/TimeView'
import TimerPanel from './components/TimerPanel'
import { bucketOf, byDue, endOfDay, formatDue, formatSpent, isSameDay } from './dates'
import { useNow, useTheme } from './hooks'
import { dayBreakdown, taskDays } from './stats'
import { supabase } from './supabase'
import { useTasks } from './store'
import type { Task } from './types'

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
  today: 'Фокус на сегодня',
  hot: 'Горит',
  soon: 'Скоро',
  quick: 'Быстрые задачи',
  notes: 'Заметки',
  time: 'Время',
  reports: 'Отчёты',
  done: 'Выполнено',
}

const EMPTY: Partial<Record<View, string>> = {
  today: 'На сегодня ничего нет. Добавьте задачу или отдохните.',
  hot: 'Ничего не горит. Хорошая новость.',
  soon: 'В ближайшие три дня дедлайнов нет.',
  quick: 'Запишите задачу одной строкой, детали добавите потом.',
  done: 'Выполненных задач пока нет.',
}

/** Срок по умолчанию для новой задачи, чтобы она сразу попала в текущий раздел. */
function defaultDue(view: View, now: number): string | null {
  if (view === 'today' || view === 'hot') {
    const d = new Date(now)
    d.setHours(18, 0, 0, 0)
    const t = Math.min(Math.max(d.getTime(), now + 3_600_000), endOfDay(now))
    return new Date(t).toISOString()
  }
  if (view === 'soon') {
    const d = new Date(now)
    d.setDate(d.getDate() + 2)
    d.setHours(18, 0, 0, 0)
    return d.toISOString()
  }
  return null
}

function Planner({ email }: { email: string }) {
  const {
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
  } = useTasks()
  const running = tasks.find((t) => t.timerStartedAt !== null)
  const now = useNow(running ? 1000 : 30_000)
  const { theme, toggle: toggleTheme } = useTheme()

  const [view, setView] = useState<View>('today')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  // 'new' — форма новой задачи, иначе id редактируемой задачи
  const [dialog, setDialog] = useState<string | null>(null)
  const [quickText, setQuickText] = useState('')

  const editing = dialog && dialog !== 'new' ? tasks.find((t) => t.id === dialog) : undefined

  const data = useMemo(() => {
    const matches = (t: Task) => tagFilter.every((g) => t.tags.includes(g))
    const allOpen = tasks.filter((t) => t.kind === 'task' && !t.done)
    const counts = {
      hot: allOpen.filter((t) => bucketOf(t, now) === 'hot').length,
      soon: allOpen.filter((t) => bucketOf(t, now) === 'soon').length,
      quick: allOpen.filter((t) => !t.dueAt).length,
    }
    const open = allOpen.filter(matches)
    const end = endOfDay(now)
    const todayDone = tasks.filter(
      (t) => t.kind === 'task' && t.done && t.doneAt && isSameDay(t.doneAt, now) && matches(t),
    )
    const todayOpen = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() <= end).sort(byDue)
    return {
      counts,
      hot: open.filter((t) => bucketOf(t, now) === 'hot').sort(byDue),
      soon: open.filter((t) => bucketOf(t, now) === 'soon').sort(byDue),
      today: [...todayOpen, ...todayDone],
      todayDone: todayDone.length,
      quick: open.filter((t) => !t.dueAt),
      notes: tasks.filter((t) => t.kind === 'note'),
      done: tasks
        .filter((t) => t.kind === 'task' && t.done && matches(t))
        .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')),
    }
  }, [tasks, tagFilter, now])

  const todaySec = useMemo(
    () => dayBreakdown(entries, tasks, now, now).total,
    [entries, tasks, now],
  )

  function submitForm(form: TaskForm) {
    if (editing) void patch(editing.id, form)
    else void add({ ...form, kind: 'task' })
  }

  function submitQuick(e: FormEvent) {
    e.preventDefault()
    const title = quickText.trim()
    if (!title) return
    void add({ title, kind: 'task', tags: tagFilter })
    setQuickText('')
  }

  const toggleTag = (id: string) =>
    setTagFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const taskView = view === 'today' || view === 'hot' || view === 'soon' || view === 'quick' || view === 'done'
  const list = taskView ? data[view] : []
  const totalToday = data.today.length

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

        {view === 'notes' && (
          <NotesView notes={data.notes} onAdd={add} onPatch={(id, p) => void patch(id, p)} onRemove={(id) => void remove(id)} />
        )}

        {view === 'time' && <TimeView entries={entries} tasks={tasks} now={now} />}

        {view === 'reports' && <ReportsView entries={entries} tasks={tasks} now={now} />}

        {taskView && (
          <>
            {view === 'quick' ? (
              <form
                onSubmit={submitQuick}
                className="mb-4 flex items-center gap-2 rounded-2xl bg-white p-2 pl-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-800"
              >
                <Plus size={18} className="shrink-0 text-slate-400" />
                <input
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder="Что нужно сделать?"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Добавить
                </button>
              </form>
            ) : (
              view !== 'done' && (
                <button
                  onClick={() => setDialog('new')}
                  className="mb-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <Plus size={16} /> Новая задача
                </button>
              )
            )}

            {view === 'today' && (data.hot.length > 0 || data.soon.length > 0) && (
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <DeadlineCard
                  title="Горит · до 1 дня"
                  icon={<Flame size={15} />}
                  tone="hot"
                  items={data.hot}
                  now={now}
                  onOpen={() => setView('hot')}
                  onEdit={setDialog}
                />
                <DeadlineCard
                  title="Скоро · до 3 дней"
                  icon={<Clock size={15} />}
                  tone="soon"
                  items={data.soon}
                  now={now}
                  onOpen={() => setView('soon')}
                  onEdit={setDialog}
                />
              </div>
            )}

            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{TITLES[view]}</h2>
              {view === 'today' && totalToday > 0 && (
                <span className="text-sm text-slate-500">
                  сделано {data.todayDone} из {totalToday}
                  {todaySec > 0 && ` · записано ${formatSpent(todaySec)}`}
                </span>
              )}
            </div>
            {view === 'today' && totalToday > 0 && (
              <div className="mb-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.round((data.todayDone / totalToday) * 100)}%` }}
                />
              </div>
            )}

            {loading ? (
              <p className="py-12 text-center text-sm text-slate-400">Загрузка…</p>
            ) : list.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">{EMPTY[view]}</p>
            ) : (
              <ul className="rounded-2xl bg-white px-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                {list.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    now={now}
                    onToggle={toggle}
                    onEdit={setDialog}
                    onStart={startTimer}
                    onPause={pauseTimer}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <div className="lg:py-6">
        <div className="lg:sticky lg:top-6">
          <TimerPanel
            task={running}
            now={now}
            todaySec={todaySec}
            onPause={pauseTimer}
            onFinish={finishTask}
          />
        </div>
      </div>

      {dialog === 'new' && (
        <TaskDialog
          now={now}
          defaults={{ dueAt: defaultDue(view, now), tags: tagFilter }}
          onSubmit={submitForm}
          onClose={() => setDialog(null)}
        />
      )}
      {editing && (
        <TaskDialog
          key={editing.id}
          task={editing}
          now={now}
          days={taskDays(entries, tasks, editing.id, now)}
          onSubmit={submitForm}
          onDelete={(id) => void remove(id)}
          onClose={() => setDialog(null)}
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
