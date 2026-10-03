import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDayLabel, formatSpent } from '../dates'
import { addDays, dayBreakdown, dayStart } from '../stats'
import { tagById } from '../tags'
import type { Task, TimeEntry } from '../types'

interface Props {
  entries: TimeEntry[]
  tasks: Task[]
  now: number
}

const pad = (n: number) => String(n).padStart(2, '0')
const toInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function TimeView({ entries, tasks, now }: Props) {
  const today = dayStart(now)
  const [day, setDay] = useState(today)
  const data = useMemo(() => dayBreakdown(entries, tasks, now, day), [entries, tasks, now, day])
  const max = data.byTask[0]?.seconds ?? 1

  function pick(value: string) {
    if (!value) return
    const [y, m, d] = value.split('-').map(Number)
    setDay(Math.min(new Date(y, m - 1, d).getTime(), today))
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setDay(addDays(day, -1))}
          aria-label="Предыдущий день"
          className="rounded-lg p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="min-w-36 text-center text-lg font-semibold capitalize">
          {formatDayLabel(day, now)}
        </h2>
        <button
          onClick={() => setDay(addDays(day, 1))}
          disabled={day >= today}
          aria-label="Следующий день"
          className="rounded-lg p-2 hover:bg-slate-200/60 disabled:opacity-30 dark:hover:bg-slate-800"
        >
          <ChevronRight size={18} />
        </button>
        <input
          type="date"
          value={toInput(day)}
          max={toInput(today)}
          onChange={(e) => pick(e.target.value)}
          aria-label="Выбрать дату"
          className="rounded-lg bg-white px-3 py-1.5 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-800"
        />
        {day !== today && (
          <button
            onClick={() => setDay(today)}
            className="rounded-lg px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800"
          >
            К сегодня
          </button>
        )}
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-sm text-slate-500">Записано за день</p>
        <p className="text-3xl font-medium">{formatSpent(data.total)}</p>
      </div>

      {data.byTask.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">
          В этот день время не записывалось. Запустите таймер ▶ у задачи.
        </p>
      ) : (
        <>
          <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="mb-2 text-sm font-medium">По задачам</p>
            <ul className="space-y-3">
              {data.byTask.map((r) => (
                <li key={r.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{r.title || 'Без названия'}</span>
                    <span className="shrink-0 text-slate-500">{formatSpent(r.seconds)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500"
                      style={{ width: `${Math.max(3, Math.round((r.seconds / max) * 100))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="mb-2 text-sm font-medium">По тегам</p>
            <ul className="space-y-1.5">
              {data.byTag.map(({ tag, seconds }) => {
                const def = tag ? tagById(tag) : undefined
                return (
                  <li key={tag ?? 'none'} className="flex items-center justify-between text-sm">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs ${
                        def?.chip ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {def?.label ?? (tag ?? 'без тега')}
                    </span>
                    <span className="text-slate-500">{formatSpent(seconds)}</span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-xs text-slate-400">
              Если у задачи несколько тегов, её время учитывается в каждом.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
