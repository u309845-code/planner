import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Plus } from 'lucide-react'
import Auth from './Auth'
import MonthView from './components/MonthView'
import NotesView from './components/NotesView'
import ReportsView from './components/ReportsView'
import RunningBar from './components/RunningBar'
import Segmented from './components/Segmented'
import Sidebar, { type View } from './components/Sidebar'
import TaskDialog, { type TaskForm } from './components/TaskDialog'
import TaskRow from './components/TaskRow'
import TasksBoard from './components/TasksBoard'
import TimeView from './components/TimeView'
import WeekView from './components/WeekView'
import {
  bucketOf,
  byDue,
  endOfDay,
  formatClock,
  formatSpent,
  isSameDay,
  toDateKey,
  totalSpentSec,
} from './dates'
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
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week')
  const [weekFocus, setWeekFocus] = useState(() => Date.now())
  const [reportsTab, setReportsTab] = useState<'analytics' | 'days'>('analytics')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  // id редактируемой задачи
  const [dialog, setDialog] = useState<string | null>(null)
  // не null — открыта форма новой задачи с этими значениями по умолчанию
  const [creating, setCreating] = useState<Partial<TaskForm> | null>(null)
  const [quickText, setQuickText] = useState('')

  const editing = dialog ? tasks.find((t) => t.id === dialog) : undefined

  // время идущего таймера видно и в названии вкладки браузера
  useEffect(() => {
    document.title = running
      ? `▶ ${formatClock(totalSpentSec(running, now))} · ${running.title}`
      : 'Planner'
  }, [running, now])

  const data = useMemo(() => {
    const matches = (t: Task) => tagFilter.every((g) => t.tags.includes(g))
    const allTasks = tasks.filter((t) => t.kind === 'task')
    const allOpen = allTasks.filter((t) => !t.done)
    const counts = {
      hot: allOpen.filter((t) => bucketOf(t, now) === 'hot').length,
      soon: allOpen.filter((t) => bucketOf(t, now) === 'soon').length,
    }
    const open = allOpen.filter(matches)
    const end = endOfDay(now)
    const todayKey = toDateKey(now)
    const todayDone = allTasks.filter(
      (t) => t.done && t.doneAt && isSameDay(t.doneAt, now) && matches(t),
    )
    // на сегодня: срок сегодня или раньше, либо день в плане сегодня или раньше
    const todayOpen = open
      .filter(
        (t) =>
          (t.dueAt && new Date(t.dueAt).getTime() <= end) || (t.planDate && t.planDate <= todayKey),
      )
      .sort(byDue)
    return {
      counts,
      tasks: allTasks.filter(matches),
      hot: open.filter((t) => bucketOf(t, now) === 'hot').sort(byDue),
      soon: open.filter((t) => bucketOf(t, now) === 'soon').sort(byDue),
      today: [...todayOpen, ...todayDone],
      todayDone: todayDone.length,
      notes: tasks.filter((t) => t.kind === 'note'),
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

  const toggleTag = (id: string) =>
    setTagFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const planTask = (id: string, planDate: string | null) => void patch(id, { planDate })
  const totalToday = data.today.length

  return (
    <div
      className={`mx-auto grid min-h-dvh max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-6 ${
        running ? 'pb-32' : ''
      }`}
    >
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

        {view === 'today' && (
          <>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-xl font-semibold">Сегодня</h2>
              <p className="text-sm text-slate-500">
                {totalToday > 0 && `сделано ${data.todayDone} из ${totalToday}`}
                {totalToday > 0 && todaySec > 0 && ' · '}
                {todaySec > 0 && (
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    записано {formatSpent(todaySec)}
                  </span>
                )}
              </p>
            </div>

            {(data.counts.hot > 0 || data.counts.soon > 0) && (
              <div className="mb-3 flex flex-wrap gap-2 text-sm">
                {data.counts.hot > 0 && (
                  <button
                    onClick={() => setView('tasks')}
                    className="rounded-full bg-red-50 px-3 py-1 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                  >
                    Срок до 1 дня · {data.counts.hot}
                  </button>
                )}
                {data.counts.soon > 0 && (
                  <button
                    onClick={() => setView('tasks')}
                    className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    Срок до 3 дней · {data.counts.soon}
                  </button>
                )}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const title = quickText.trim()
                if (!title) return
                void add({ title, kind: 'task', planDate: toDateKey(now), tags: tagFilter })
                setQuickText('')
              }}
              className="mb-3 flex items-center gap-2 rounded-2xl bg-white p-1.5 pl-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-800"
            >
              <Plus size={17} className="shrink-0 text-slate-400" />
              <input
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Добавить задачу на сегодня"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setCreating({ planDate: toDateKey(now), tags: tagFilter })}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Подробнее
              </button>
            </form>
            {totalToday > 0 && (
              <div className="mb-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.round((data.todayDone / totalToday) * 100)}%` }}
                />
              </div>
            )}

            {loading ? (
              <p className="py-12 text-center text-sm text-slate-400">Загрузка…</p>
            ) : totalToday === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">
                На сегодня ничего нет. Добавьте задачу или отдохните.
              </p>
            ) : (
              <ul className="rounded-2xl bg-white px-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                {data.today.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    now={now}
                    onToggle={toggle}
                    onEdit={setDialog}
                    onStart={startTimer}
                    onPause={pauseTimer}
                    onChecklist={(id, checklist) => void patch(id, { checklist })}
                  />
                ))}
              </ul>
            )}
          </>
        )}

        {view === 'calendar' && (
          <>
            <div className="mb-4">
              <Segmented
                value={calendarMode}
                onChange={setCalendarMode}
                options={[
                  { id: 'week', label: 'Неделя' },
                  { id: 'month', label: 'Месяц' },
                ]}
              />
            </div>
            {calendarMode === 'week' ? (
              <WeekView
                key={weekFocus}
                tasks={data.tasks}
                now={now}
                initialAnchor={weekFocus}
                onPlan={planTask}
                onEdit={setDialog}
                onToggle={toggle}
                onCreate={(planDate) => setCreating({ planDate, tags: tagFilter })}
              />
            ) : (
              <MonthView
                tasks={data.tasks}
                now={now}
                onPlan={planTask}
                onEdit={setDialog}
                onCreate={(planDate) => setCreating({ planDate, tags: tagFilter })}
                onOpenDay={(day) => {
                  setWeekFocus(day)
                  setCalendarMode('week')
                }}
              />
            )}
          </>
        )}

        {view === 'tasks' && (
          <TasksBoard
            tasks={data.tasks}
            now={now}
            onEdit={setDialog}
            onToggle={toggle}
            onSetDue={(id, dueAt) => void patch(id, { dueAt })}
            onQuickAdd={(title) => void add({ title, kind: 'task', tags: tagFilter })}
            onNew={() => setCreating({ tags: tagFilter })}
          />
        )}

        {view === 'notes' && (
          <NotesView
            notes={data.notes}
            onAdd={add}
            onPatch={(id, p) => void patch(id, p)}
            onRemove={(id) => void remove(id)}
          />
        )}

        {view === 'reports' && (
          <>
            <div className="mb-4">
              <Segmented
                value={reportsTab}
                onChange={setReportsTab}
                options={[
                  { id: 'analytics', label: 'Аналитика' },
                  { id: 'days', label: 'По дням' },
                ]}
              />
            </div>
            {reportsTab === 'analytics' ? (
              <ReportsView entries={entries} tasks={tasks} now={now} />
            ) : (
              <TimeView entries={entries} tasks={tasks} now={now} />
            )}
          </>
        )}
      </main>

      {running && (
        <RunningBar task={running} now={now} onPause={pauseTimer} onFinish={finishTask} />
      )}

      {creating && (
        <TaskDialog
          now={now}
          defaults={creating}
          onSubmit={submitForm}
          onClose={() => setCreating(null)}
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
