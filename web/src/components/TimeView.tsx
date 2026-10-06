import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { csvDate, downloadCsv, minutes, toCsv } from '../csv'
import { formatDayLabel, formatSpent, toDateKey, weekStart } from '../dates'
import { addDays, aggregate, dayBreakdown, dayStart, usageRows } from '../stats'
import { tagById } from '../tags'
import type { Task, TimeEntry } from '../types'
import Segmented from './Segmented'

interface Props {
  entries: TimeEntry[]
  tasks: Task[]
  now: number
}

type Mode = 'day' | 'week' | 'month'

const pad = (n: number) => String(n).padStart(2, '0')
const toInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 5400 сек → «1:30»; меньше минуты → «·» */
function cell(sec: number): string {
  if (sec <= 0) return ''
  const min = Math.floor(sec / 60)
  if (min === 0) return '·'
  return `${Math.floor(min / 60)}:${pad(min % 60)}`
}

function rangeOf(mode: Mode, anchor: number): { from: number; to: number } {
  if (mode === 'day') return { from: anchor, to: addDays(anchor, 1) }
  if (mode === 'week') {
    const from = weekStart(anchor)
    return { from, to: addDays(from, 7) }
  }
  const a = new Date(anchor)
  return {
    from: new Date(a.getFullYear(), a.getMonth(), 1).getTime(),
    to: new Date(a.getFullYear(), a.getMonth() + 1, 1).getTime(),
  }
}

export default function TimeView({ entries, tasks, now }: Props) {
  const today = dayStart(now)
  const [mode, setMode] = useState<Mode>('day')
  const [anchor, setAnchor] = useState(today)

  const { from, to } = rangeOf(mode, anchor)

  function shift(dir: 1 | -1) {
    if (mode === 'day') setAnchor(addDays(anchor, dir))
    else if (mode === 'week') setAnchor(addDays(from, dir * 7))
    else setAnchor(new Date(new Date(from).getFullYear(), new Date(from).getMonth() + dir, 1).getTime())
  }

  function pick(value: string) {
    if (!value) return
    const [y, m, d] = value.split('-').map(Number)
    setAnchor(Math.min(new Date(y, m - 1, d).getTime(), today))
  }

  const atPresent = to > today
  const label =
    mode === 'day'
      ? formatDayLabel(from, now)
      : mode === 'week'
        ? `${new Date(from).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${new Date(addDays(to, -1)).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
        : new Date(from).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m)
            setAnchor(today)
          }}
          options={[
            { id: 'day', label: 'День' },
            { id: 'week', label: 'Неделя' },
            { id: 'month', label: 'Месяц' },
          ]}
        />
        <button
          onClick={() => shift(-1)}
          aria-label="Назад"
          className="rounded-lg p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="min-w-36 text-center text-lg font-semibold capitalize">{label}</h2>
        <button
          onClick={() => shift(1)}
          disabled={atPresent}
          aria-label="Вперёд"
          className="rounded-lg p-2 hover:bg-slate-200/60 disabled:opacity-30 dark:hover:bg-slate-800"
        >
          <ChevronRight size={18} />
        </button>
        <input
          type="date"
          value={toInput(mode === 'day' ? from : Math.min(anchor, today))}
          max={toInput(today)}
          onChange={(e) => pick(e.target.value)}
          aria-label="Выбрать дату"
          className="rounded-lg bg-white px-3 py-1.5 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-800"
        />
        {atPresent ? null : (
          <button
            onClick={() => setAnchor(today)}
            className="rounded-lg px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800"
          >
            К сегодня
          </button>
        )}
      </div>

      {mode === 'day' ? (
        <DayDetails entries={entries} tasks={tasks} now={now} day={from} />
      ) : (
        <Timesheet entries={entries} tasks={tasks} now={now} from={from} to={to} today={today} />
      )}
    </div>
  )
}

function DayDetails({
  entries,
  tasks,
  now,
  day,
}: Props & { day: number }) {
  const data = useMemo(() => dayBreakdown(entries, tasks, now, day), [entries, tasks, now, day])
  const max = data.byTask[0]?.seconds ?? 1

  return (
    <>
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

          <TagTotals byTag={data.byTag} />
        </>
      )}
    </>
  )
}

function TagTotals({ byTag }: { byTag: { tag: string | null; seconds: number }[] }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="mb-2 text-sm font-medium">По тегам</p>
      <ul className="space-y-1.5">
        {byTag.map(({ tag, seconds }) => {
          const def = tag ? tagById(tag) : undefined
          return (
            <li key={tag ?? 'none'} className="flex items-center justify-between text-sm">
              <span
                className={`rounded-md px-2 py-0.5 text-xs ${
                  def?.chip ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {def?.label ?? tag ?? 'без тега'}
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
  )
}

/** Таблица «задачи × дни»: сумма по каждой задаче справа, по каждому дню внизу. */
function Timesheet({
  entries,
  tasks,
  now,
  from,
  to,
  today,
}: Props & { from: number; to: number; today: number }) {
  const sheet = useMemo(() => {
    const rows = usageRows(entries, tasks, now, from, to)
    const days: number[] = []
    for (let d = from; d < to; d = addDays(d, 1)) days.push(d)

    const byTask = new Map<string, { title: string; tags: string[]; total: number; days: Map<number, number> }>()
    const dayTotals = new Map<number, number>()
    for (const r of rows) {
      const item = byTask.get(r.key) ?? { title: r.title, tags: r.tags, total: 0, days: new Map() }
      item.total += r.seconds
      item.days.set(r.day, (item.days.get(r.day) ?? 0) + r.seconds)
      byTask.set(r.key, item)
      dayTotals.set(r.day, (dayTotals.get(r.day) ?? 0) + r.seconds)
    }
    const list = [...byTask.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.total - a.total)
    return { days, list, dayTotals, total: aggregate(rows).total, byTag: aggregate(rows).byTag }
  }, [entries, tasks, now, from, to])

  function exportCsv() {
    const head = [
      'Задача',
      'Теги',
      ...sheet.days.map((d) => csvDate(d)),
      'Всего, мин',
    ]
    const body = sheet.list.map((t) => [
      t.title,
      t.tags.map((id) => tagById(id)?.label ?? id).join(', '),
      ...sheet.days.map((d) => (t.days.get(d) ? minutes(t.days.get(d)!) : '')),
      minutes(t.total),
    ])
    const foot = [
      'Итого',
      '',
      ...sheet.days.map((d) => (sheet.dayTotals.get(d) ? minutes(sheet.dayTotals.get(d)!) : '')),
      minutes(sheet.total),
    ]
    downloadCsv(`planner-timesheet-${toDateKey(from)}_${toDateKey(addDays(to, -1))}.csv`, toCsv([head, ...body, foot]))
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div>
          <p className="text-sm text-slate-500">Записано за период</p>
          <p className="text-3xl font-medium">{formatSpent(sheet.total)}</p>
        </div>
        {sheet.list.length > 0 && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Download size={15} /> Скачать таблицу (CSV)
          </button>
        )}
      </div>

      {sheet.list.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">
          За этот период время не записывалось. Запустите таймер ▶ у задачи.
        </p>
      ) : (
        <>
          <div className="mb-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <table className="w-full border-collapse text-sm tabular-nums">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="sticky left-0 z-10 min-w-48 bg-white px-3 py-2 text-left font-normal dark:bg-slate-900">
                    Задача
                  </th>
                  {sheet.days.map((d) => (
                    <th
                      key={d}
                      className={`min-w-11 px-1.5 py-2 text-center font-normal ${
                        d === today ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''
                      }`}
                    >
                      <span className="block uppercase">
                        {new Date(d).toLocaleDateString('ru-RU', { weekday: 'short' })}
                      </span>
                      {new Date(d).getDate()}
                    </th>
                  ))}
                  <th className="min-w-24 px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-200">
                    Всего
                  </th>
                </tr>
              </thead>
              <tbody>
                {sheet.list.map((t) => (
                  <tr key={t.key} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="sticky left-0 z-10 max-w-64 truncate bg-white px-3 py-2 dark:bg-slate-900">
                      {t.title || 'Без названия'}
                      {t.tags.map((id) => {
                        const tag = tagById(id)
                        return tag ? (
                          <span
                            key={id}
                            title={tag.label}
                            className={`ml-1.5 inline-block size-2 rounded-full ${tag.dot}`}
                          />
                        ) : null
                      })}
                    </td>
                    {sheet.days.map((d) => (
                      <td
                        key={d}
                        className={`px-1.5 py-2 text-center text-slate-600 dark:text-slate-300 ${
                          d === today ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        {cell(t.days.get(d) ?? 0)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium">{formatSpent(t.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-medium dark:border-slate-700">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 dark:bg-slate-900">Итого</td>
                  {sheet.days.map((d) => (
                    <td key={d} className="px-1.5 py-2 text-center">
                      {cell(sheet.dayTotals.get(d) ?? 0)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">{formatSpent(sheet.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mb-4 text-xs text-slate-400">
            В ячейках часы:минуты. Точка означает меньше минуты.
          </p>

          <TagTotals byTag={sheet.byTag} />
        </>
      )}
    </>
  )
}
