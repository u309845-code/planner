import { ChevronLeft, ChevronRight, Flag, Plus } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { deadlinesOn, plannedOn } from '../calendar'
import { byDue, formatDue, formatMinutes, toDateKey, weekStart } from '../dates'
import { addDays, dayStart } from '../stats'
import type { Task } from '../types'
import TaskCard from './TaskCard'

interface Props {
  /** Задачи (уже отфильтрованные по тегам), без заметок */
  tasks: Task[]
  now: number
  /** Какая неделя открыта сначала (любой день недели) */
  initialAnchor: number
  onPlan: (id: string, planDate: string | null) => void
  onEdit: (id: string) => void
  onToggle: (id: string) => void
  onCreate: (planDate: string) => void
}

const fmt = (ms: number, opts: Intl.DateTimeFormatOptions) =>
  new Date(ms).toLocaleDateString('ru-RU', opts)

export default function WeekView({
  tasks,
  now,
  initialAnchor,
  onPlan,
  onEdit,
  onToggle,
  onCreate,
}: Props) {
  const today = dayStart(now)
  const [anchor, setAnchor] = useState(initialAnchor)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const from = weekStart(anchor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const todayKey = toDateKey(today)

  const backlog = tasks
    .filter((t) => !t.done && !t.planDate)
    .sort((a, b) => byDue(a, b) || a.createdAt.localeCompare(b.createdAt))

  function drop(e: DragEvent, key: string | null) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setOver(null)
    setDragging(null)
    if (id) onPlan(id, key)
  }

  const dropProps = (key: string | null) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      setOver(key ?? 'backlog')
    },
    onDragLeave: () => setOver((o) => (o === (key ?? 'backlog') ? null : o)),
    onDrop: (e: DragEvent) => drop(e, key),
  })

  const card = (t: Task) => (
    <TaskCard
      key={t.id}
      task={t}
      now={now}
      dragging={dragging === t.id}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', t.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(t.id)
      }}
      onDragEnd={() => {
        setDragging(null)
        setOver(null)
      }}
      onEdit={onEdit}
      onToggle={onToggle}
    />
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setAnchor(addDays(from, -7))}
          aria-label="Предыдущая неделя"
          className="rounded-lg p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="min-w-44 text-center text-lg font-semibold">
          {fmt(from, { day: 'numeric', month: 'short' })} — {fmt(addDays(from, 6), { day: 'numeric', month: 'short' })}
        </h2>
        <button
          onClick={() => setAnchor(addDays(from, 7))}
          aria-label="Следующая неделя"
          className="rounded-lg p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        >
          <ChevronRight size={18} />
        </button>
        {weekStart(today) !== from && (
          <button
            onClick={() => setAnchor(today)}
            className="rounded-lg px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800"
          >
            Эта неделя
          </button>
        )}
        <p className="ml-auto flex shrink-0 items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-red-400" /> срок до 1 дня
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-amber-400" /> до 3 дней
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((d) => {
          const key = toDateKey(d)
          const isToday = key === todayKey
          const planned = plannedOn(tasks, key)
          const deadlines = deadlinesOn(tasks, key)
          const planMin = planned.reduce((s, t) => s + (t.plannedMin ?? 0), 0)
          const isOver = over === key
          return (
            <section
              key={key}
              {...dropProps(key)}
              className={`flex min-h-48 min-w-0 flex-col rounded-2xl p-2 ring-1 transition ${
                isOver
                  ? 'bg-indigo-50 ring-2 ring-indigo-400 dark:bg-indigo-950/40'
                  : isToday
                    ? 'bg-white ring-2 ring-indigo-300 dark:bg-slate-900 dark:ring-indigo-700'
                    : 'bg-white/60 ring-slate-200 dark:bg-slate-900/40 dark:ring-slate-800'
              }`}
            >
              <header className="mb-2 flex items-center gap-2 px-1">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {new Date(d).getDate()}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {fmt(d, { weekday: 'short' })}
                  </p>
                  {planMin > 0 && (
                    <p className="truncate text-xs text-slate-400">≈ {formatMinutes(planMin)}</p>
                  )}
                </div>
                <button
                  onClick={() => onCreate(key)}
                  aria-label="Добавить задачу на этот день"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-indigo-600 dark:hover:bg-slate-800"
                >
                  <Plus size={16} />
                </button>
              </header>

              <div className="space-y-1.5">
                {deadlines.map((t) => (
                  <button
                    key={`dl-${t.id}`}
                    onClick={() => onEdit(t.id)}
                    className="flex w-full items-center gap-1 rounded-lg border border-dashed border-red-300 px-2 py-1 text-left text-xs text-red-600 dark:border-red-900 dark:text-red-300"
                    title="Дедлайн в этот день (задача запланирована на другой)"
                  >
                    <Flag size={11} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="shrink-0 whitespace-nowrap opacity-70">
                      {t.dueAt && formatDue(t.dueAt, now).split(' ').pop()}
                    </span>
                  </button>
                ))}
                {planned.map(card)}
              </div>
            </section>
          )
        })}
      </div>

      <section
        {...dropProps(null)}
        className={`mt-4 rounded-2xl p-3 ring-1 transition ${
          over === 'backlog'
            ? 'bg-indigo-50 ring-2 ring-indigo-400 dark:bg-indigo-950/40'
            : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
        }`}
      >
        <p className="mb-2 text-sm font-medium">
          Не запланировано <span className="font-normal text-slate-500">· {backlog.length}</span>
        </p>
        {backlog.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-400">
            Всё разложено по дням. Перетащите сюда карточку, чтобы убрать её из плана.
          </p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{backlog.map(card)}</div>
        )}
      </section>

      <p className="mt-3 text-xs text-slate-400">
        Перетаскивайте карточки мышью. Тот же результат даёт поле «День в плане» в задаче. На телефоне
        перетаскивание пока не работает.
      </p>
    </div>
  )
}
