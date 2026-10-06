import { ChevronLeft, ChevronRight, Flag, Plus } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { deadlinesOn, plannedOn } from '../calendar'
import { bucketOf, toDateKey, weekStart } from '../dates'
import { addDays, dayStart } from '../stats'
import type { Task } from '../types'

interface Props {
  tasks: Task[]
  now: number
  onPlan: (id: string, planDate: string | null) => void
  onEdit: (id: string) => void
  onCreate: (planDate: string) => void
  /** Открыть неделю с этим днём */
  onOpenDay: (day: number) => void
}

const MAX_CHIPS = 3
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function MonthView({ tasks, now, onPlan, onEdit, onCreate, onOpenDay }: Props) {
  const today = dayStart(now)
  const [anchor, setAnchor] = useState(today)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const a = new Date(anchor)
  const first = new Date(a.getFullYear(), a.getMonth(), 1).getTime()
  const nextMonth = new Date(a.getFullYear(), a.getMonth() + 1, 1).getTime()
  const gridStart = weekStart(first)
  const gridEnd = addDays(weekStart(addDays(nextMonth, -1)), 7)
  const count = Math.round((gridEnd - gridStart) / 86_400_000)
  const cells = Array.from({ length: count }, (_, i) => addDays(gridStart, i))
  const todayKey = toDateKey(today)

  function shift(dir: 1 | -1) {
    setAnchor(new Date(a.getFullYear(), a.getMonth() + dir, 1).getTime())
  }

  function drop(e: DragEvent, key: string) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setOver(null)
    setDragging(null)
    if (id) onPlan(id, key)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => shift(-1)}
          aria-label="Предыдущий месяц"
          className="rounded-lg p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="min-w-44 text-center text-lg font-semibold capitalize">
          {new Date(first).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={() => shift(1)}
          aria-label="Следующий месяц"
          className="rounded-lg p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        >
          <ChevronRight size={18} />
        </button>
        {new Date(today).getMonth() !== a.getMonth() || new Date(today).getFullYear() !== a.getFullYear() ? (
          <button
            onClick={() => setAnchor(today)}
            className="rounded-lg px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800"
          >
            Этот месяц
          </button>
        ) : null}
        <p className="ml-auto flex shrink-0 items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-red-400" /> срок до 1 дня
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-amber-400" /> до 3 дней
          </span>
        </p>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const key = toDateKey(d)
          const inMonth = new Date(d).getMonth() === a.getMonth()
          const isToday = key === todayKey
          const planned = plannedOn(tasks, key)
          const deadlines = deadlinesOn(tasks, key)
          const items: { task: Task; kind: 'plan' | 'deadline' }[] = [
            ...deadlines.map((task) => ({ task, kind: 'deadline' as const })),
            ...planned.map((task) => ({ task, kind: 'plan' as const })),
          ]
          const shown = items.slice(0, MAX_CHIPS)
          const hidden = items.length - shown.length
          return (
            <div
              key={key}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(key)
              }}
              onDragLeave={() => setOver((o) => (o === key ? null : o))}
              onDrop={(e) => drop(e, key)}
              className={`group flex min-h-24 min-w-0 flex-col rounded-lg p-1 ring-1 transition ${
                over === key
                  ? 'bg-indigo-50 ring-2 ring-indigo-400 dark:bg-indigo-950/40'
                  : isToday
                    ? 'bg-white ring-2 ring-indigo-300 dark:bg-slate-900 dark:ring-indigo-700'
                    : inMonth
                      ? 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
                      : 'bg-transparent opacity-50 ring-slate-200/60 dark:ring-slate-800/60'
              }`}
            >
              <div className="mb-0.5 flex items-center justify-between">
                <button
                  onClick={() => onOpenDay(d)}
                  title="Открыть неделю"
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-medium hover:bg-slate-200/70 dark:hover:bg-slate-800 ${
                    isToday ? 'bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-600' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {new Date(d).getDate()}
                </button>
                <button
                  onClick={() => onCreate(key)}
                  aria-label="Добавить задачу на этот день"
                  className="rounded p-0.5 text-slate-400 opacity-0 transition hover:text-indigo-600 group-hover:opacity-100"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-0.5">
                {shown.map(({ task: t, kind }) => {
                  const bucket = bucketOf(t, now)
                  const tone =
                    kind === 'deadline'
                      ? 'border border-dashed border-red-300 text-red-600 dark:border-red-900 dark:text-red-300'
                      : t.done
                        ? 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800'
                        : bucket === 'hot'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                          : bucket === 'soon'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  return (
                    <button
                      key={`${kind}-${t.id}`}
                      draggable={kind === 'plan'}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', t.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setDragging(t.id)
                      }}
                      onDragEnd={() => {
                        setDragging(null)
                        setOver(null)
                      }}
                      onClick={() => onEdit(t.id)}
                      title={t.title}
                      className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight ${tone} ${
                        dragging === t.id ? 'opacity-40' : ''
                      } ${kind === 'plan' ? 'cursor-grab' : ''}`}
                    >
                      {kind === 'deadline' && <Flag size={10} className="shrink-0" />}
                      <span className="truncate">{t.title}</span>
                    </button>
                  )
                })}
                {hidden > 0 && (
                  <button
                    onClick={() => onOpenDay(d)}
                    className="px-1 text-[11px] text-slate-500 hover:text-indigo-600"
                  >
                    ещё {hidden}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Перетащите задачу в другой день, чтобы перенести её в плане. Пунктирные строки — дедлайны.
        Нажмите на число, чтобы открыть неделю.
      </p>
    </div>
  )
}
