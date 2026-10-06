import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Clock, Flame, Plus } from 'lucide-react'
import Auth from './Auth'
import HomeHero from './components/HomeHero'
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
  formatDue,
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

/** Срок по умолчанию для новой задачи на «Сегодня»: сегодня к 18:00 (но не раньше, чем через час). */
function defaultDueToday(now: number): string {
  const d = new Date(now)
  d.setHours(18, 0, 0, 0)
  return new Date(Math.min(Math.max(d.getTime(), now + 3_600_000), endOfDay(now))).toISOString()
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

  const editing = dialog ? tasks.find((t) => t.id === dialog) : undefined

  // время идущего таймера видно и в названии вкладки браузера
  useEffect(() => {
    document.title = running
      ? `▶ ${formatClock(totalSpentSec(running, now))} · ${running.title}`
      : 'Планер'
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
            <HomeHero total={totalToday} done={data.todayDone} hot={data.counts.hot} />

            <button
              onClick={() => setCreating({ dueAt: defaultDueToday(now), tags: tagFilter })}
              className="mb-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <Plus size={16} /> Новая задача
            </button>

            {(data.hot.length > 0 || data.soon.length > 0) && (
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <DeadlineCard
                  title="Горит · до 1 дня"
                  icon={<Flame size={15} />}
                  tone="hot"
                  items={data.hot}
                  now={now}
                  onOpen={() => setView('tasks')}
                  onEdit={setDialog}
                />
                <DeadlineCard
                  title="Скоро · до 3 дней"
                  icon={<Clock size={15} />}
                  tone="soon"
                  items={data.soon}
                  now={now}
                  onOpen={() => setView('tasks')}
                  onEdit={setDialog}
                />
              </div>
            )}

            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 className="text-lg font-semibold">Фокус на сегодня</h2>
              <span className="text-sm text-slate-500">
                {totalToday > 0 && `сделано ${data.todayDone} из ${totalToday}`}
                {totalToday > 0 && todaySec > 0 && ' · '}
                {todaySec > 0 && `записано ${formatSpent(todaySec)}`}
              </span>
            </div>
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
