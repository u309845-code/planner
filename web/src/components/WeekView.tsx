import { ChevronLeft, ChevronRight, Flag, Plus } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import {
  bucketOf,
  byDue,
  formatDue,
  formatMinutes,
  fromDateKey,
  toDateKey,
  weekStart,
} from '../dates'
import { addDays, dayStart } from '../stats'
import { tagById } from '../tags'
import type { Task } from '../types'

interface Props {
  /** Задачи (уже отфильтрованные по тегам), без заметок */
  tasks: Task[]
  now: number
  onPlan: (id: string, planDate: string | null) => void
  onEdit: (id: string) => void
  onToggle: (id: string) => void
  onCreate: (planDate: string) => void
}

const fmt = (ms: number, opts: Intl.DateTimeFormatOptions) =>
  new Date(ms).toLocaleDateString('ru-RU', opts)

const sameDay = (iso: string, key: string) => toDateKey(new Date(iso).getTime()) === key

export default function WeekView({ tasks, now, onPlan, onEdit, onToggle, onCreate }: Props) {
  const today = dayStart(now)
  const [anchor, setAnchor] = useState(today)
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
    <WeekCard
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
        <p className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-red-400" /> горит
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-amber-400" /> скоро
          </span>
        </p>
      </div>

      <div
        className="grid gap-2 overflow-x-auto pb-1"
        style={{ gridTemplateColumns: 'repeat(5, minmax(150px, 1.2fr)) repeat(2, minmax(120px, 0.8fr))' }}
      >
        {days.map((d) => {
          const key = toDateKey(d)
          const isToday = key === todayKey
          const planned = tasks
            .filter((t) => t.planDate === key)
            .sort((a, b) => Number(a.done) - Number(b.done) || byDue(a, b))
          const deadlines = tasks.filter(
            (t) => !t.done && t.dueAt && t.planDate !== key && sameDay(t.dueAt, key),
          )
          const planMin = planned.reduce((s, t) => s + (t.plannedMin ?? 0), 0)
          const isOver = over === key
          return (
            <section
              key={key}
              {...dropProps(key)}
              className={`flex min-h-56 flex-col rounded-2xl p-2 ring-1 transition ${
                isOver
                  ? 'bg-indigo-50 ring-2 ring-indigo-400 dark:bg-indigo-950/40'
                  : isToday
                    ? 'bg-white ring-indigo-300 dark:bg-slate-900 dark:ring-indigo-700'
                    : 'bg-slate-100/60 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-800'
              }`}
            >
              <header className="mb-2 flex items-center gap-1 px-1">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium capitalize ${isToday ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                    {fmt(d, { weekday: 'short' })}, {new Date(d).getDate()}
                  </p>
                  {planMin > 0 && (
                    <p className="text-xs text-slate-500">≈ {formatMinutes(planMin)}</p>
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
                    <span className="truncate">{t.title}</span>
                    <span className="ml-auto shrink-0 opacity-70">{t.dueAt && formatDue(t.dueAt, now).split(' ').pop()}</span>
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

function WeekCard({
  task: t,
  now,
  dragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onToggle,
}: {
  task: Task
  now: number
  dragging: boolean
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
  onEdit: (id: string) => void
  onToggle: (id: string) => void
}) {
  const bucket = bucketOf(t, now)
  const tone =
    bucket === 'hot'
      ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
      : bucket === 'soon'
        ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
  const overdue = t.planDate && !t.done && fromDateKey(t.planDate) < dayStart(now)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-xl border p-2 text-sm active:cursor-grabbing ${tone} ${
        dragging ? 'opacity-40' : ''
      } ${t.done ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => onToggle(t.id)}
          aria-label="Выполнено"
          className="mt-0.5 size-4 shrink-0 accent-emerald-600"
        />
        <button onClick={() => onEdit(t.id)} className="min-w-0 flex-1 text-left">
          <span className={`block break-words leading-snug ${t.done ? 'line-through' : ''}`}>
            {t.priority > 0 && !t.done && (
              <Flag
                size={12}
                className={`mr-1 inline -translate-y-px ${t.priority === 2 ? 'text-red-500' : 'text-amber-500'}`}
              />
            )}
            {t.title}
          </span>
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-6 text-[11px] text-slate-500">
        {t.tags.map((id) => {
          const tag = tagById(id)
          return tag ? <span key={id} className={`size-2 rounded-full ${tag.dot}`} title={tag.label} /> : null
        })}
        {t.dueAt && !t.done && <span>{formatDue(t.dueAt, now)}</span>}
        {t.plannedMin !== null && <span>· {formatMinutes(t.plannedMin)}</span>}
        {overdue && <span className="text-red-500">· план прошёл</span>}
      </div>
    </div>
  )
}
