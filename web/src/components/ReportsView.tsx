import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { csvDate, csvDateTime, downloadCsv, minutes, toCsv } from '../csv'
import { formatMinutes, formatSpent } from '../dates'
import { addDays, aggregate, dayStart, usageRows } from '../stats'
import { TAGS, tagById } from '../tags'
import type { Task, TimeEntry } from '../types'

interface Props {
  entries: TimeEntry[]
  tasks: Task[]
  now: number
}

type Mode = 'week' | 'month' | 'custom'

const pad = (n: number) => String(n).padStart(2, '0')
const toInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const fromInput = (v: string) => {
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

const PRIORITY = ['Обычный', 'Важный', 'Очень важный']
const fmt = (ms: number, opts: Intl.DateTimeFormatOptions) =>
  new Date(ms).toLocaleDateString('ru-RU', opts)

/** Период [from, to): начала суток. */
function periodRange(mode: Mode, anchor: number, custom: { from: number; to: number }) {
  if (mode === 'week') {
    const d = dayStart(anchor)
    const from = addDays(d, -((new Date(d).getDay() + 6) % 7))
    return { from, to: addDays(from, 7) }
  }
  if (mode === 'month') {
    const d = new Date(anchor)
    return {
      from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
      to: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
    }
  }
  return { from: custom.from, to: addDays(custom.to, 1) }
}

export default function ReportsView({ entries, tasks, now }: Props) {
  const today = dayStart(now)
  const [mode, setMode] = useState<Mode>('week')
  const [anchor, setAnchor] = useState(today)
  const [custom, setCustom] = useState({ from: addDays(today, -13), to: today })

  const { from, to } = periodRange(mode, anchor, custom)
  const days = Math.max(1, Math.round((to - from) / 86_400_000))

  const label =
    mode === 'month'
      ? fmt(from, { month: 'long', year: 'numeric' })
      : `${fmt(from, { day: 'numeric', month: 'short' })} — ${fmt(addDays(to, -1), { day: 'numeric', month: 'short' })}`

  const report = useMemo(() => {
    const taskTasks = tasks.filter((t) => t.kind === 'task')
    const inRange = (iso: string | null) =>
      iso !== null && new Date(iso).getTime() >= from && new Date(iso).getTime() < to

    const rows = usageRows(entries, tasks, now, from, to)
    const time = aggregate(rows)
    const closed = taskTasks.filter((t) => t.done && inRange(t.doneAt))
    const created = taskTasks.filter((t) => inRange(t.createdAt))

    const withDeadline = closed.filter((t) => t.dueAt)
    const onTime = withDeadline.filter((t) => new Date(t.doneAt!).getTime() <= new Date(t.dueAt!).getTime())

    const measured = closed.filter((t) => (t.plannedMin ?? 0) > 0 && t.spentSec > 0)
    const planSec = measured.reduce((s, t) => s + t.plannedMin! * 60, 0)
    const factSec = measured.reduce((s, t) => s + t.spentSec, 0)

    const closedByDay = new Map<number, number>()
    for (const t of closed) {
      const d = dayStart(new Date(t.doneAt!).getTime())
      closedByDay.set(d, (closedByDay.get(d) ?? 0) + 1)
    }

    const tagIds = new Set<string | null>([...time.byTag.map((x) => x.tag)])
    for (const t of closed) for (const tag of t.tags.length ? t.tags : [null]) tagIds.add(tag)
    const tagRows = [...tagIds]
      .map((tag) => ({
        tag,
        closed: closed.filter((t) => (tag ? t.tags.includes(tag) : t.tags.length === 0)).length,
        seconds: time.byTag.find((x) => x.tag === tag)?.seconds ?? 0,
      }))
      .sort((a, b) => b.seconds - a.seconds || b.closed - a.closed)

    const exportTasks = taskTasks.filter(
      (t) => closed.includes(t) || created.includes(t) || rows.some((r) => r.taskId === t.id),
    )
    return { rows, time, closed, created, withDeadline, onTime, planSec, factSec, closedByDay, tagRows, exportTasks, measured: measured.length }
  }, [entries, tasks, now, from, to])

  const chartDays = Array.from({ length: Math.min(days, 92) }, (_, i) => addDays(from, i))
  const maxDay = Math.max(1, ...chartDays.map((d) => report.time.byDay.get(d) ?? 0))

  function step(dir: 1 | -1) {
    if (mode === 'week') setAnchor(addDays(from, dir * 7))
    else if (mode === 'month') setAnchor(new Date(new Date(from).getFullYear(), new Date(from).getMonth() + dir, 1).getTime())
  }

  const file = `${toInput(from)}_${toInput(addDays(to, -1))}`

  function exportTasks() {
    const head = ['Название', 'Теги', 'Приоритет', 'Дедлайн', 'Статус', 'Закрыта', 'Закрыта в срок', 'План, мин', 'Время за период, мин', 'Время всего, мин', 'Создана']
    const spentInPeriod = new Map<string, number>()
    for (const r of report.rows) if (r.taskId) spentInPeriod.set(r.taskId, (spentInPeriod.get(r.taskId) ?? 0) + r.seconds)
    const body = report.exportTasks.map((t) => [
      t.title,
      t.tags.map((id) => tagById(id)?.label ?? id).join(', '),
      PRIORITY[t.priority],
      csvDateTime(t.dueAt),
      t.done ? 'Выполнена' : 'В работе',
      csvDateTime(t.doneAt),
      t.done && t.dueAt ? (new Date(t.doneAt!).getTime() <= new Date(t.dueAt).getTime() ? 'Да' : 'Нет') : '',
      t.plannedMin,
      minutes(spentInPeriod.get(t.id) ?? 0),
      minutes(t.spentSec),
      csvDateTime(t.createdAt),
    ])
    downloadCsv(`planner-tasks-${file}.csv`, toCsv([head, ...body]))
  }

  function exportDays() {
    const head = ['Дата', 'Задача', 'Теги', 'Время, мин']
    const body = report.rows.map((r) => [
      csvDate(r.day),
      r.title,
      r.tags.map((id) => tagById(id)?.label ?? id).join(', '),
      minutes(r.seconds),
    ])
    downloadCsv(`planner-time-by-day-${file}.csv`, toCsv([head, ...body]))
  }

  const card = 'rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
  const input =
    'rounded-lg bg-white px-3 py-1.5 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-800'

  let accuracy: string | null = null
  if (report.measured > 0 && report.planSec > 0) {
    const pct = Math.round((report.factSec / report.planSec - 1) * 100)
    accuracy =
      Math.abs(pct) <= 5
        ? 'Оценки почти точные'
        : pct > 0
          ? `Задачи занимают на ${pct}% больше плана`
          : `Задачи занимают на ${-pct}% меньше плана`
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-slate-200/60 p-0.5 text-sm dark:bg-slate-900">
          {(
            [
              ['week', 'Неделя'],
              ['month', 'Месяц'],
              ['custom', 'Период'],
            ] as const
          ).map(([m, name]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setAnchor(today)
              }}
              className={`rounded-md px-3 py-1 transition ${
                mode === m ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {mode !== 'custom' ? (
          <>
            <button
              onClick={() => step(-1)}
              aria-label="Назад"
              className="rounded-lg p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-36 text-center font-semibold capitalize">{label}</span>
            <button
              onClick={() => step(1)}
              disabled={to > today}
              aria-label="Вперёд"
              className="rounded-lg p-2 hover:bg-slate-200/60 disabled:opacity-30 dark:hover:bg-slate-800"
            >
              <ChevronRight size={18} />
            </button>
          </>
        ) : (
          <>
            <input
              type="date"
              value={toInput(custom.from)}
              max={toInput(custom.to)}
              onChange={(e) => e.target.value && setCustom({ ...custom, from: fromInput(e.target.value) })}
              aria-label="С даты"
              className={input}
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              value={toInput(custom.to)}
              min={toInput(custom.from)}
              max={toInput(today)}
              onChange={(e) => e.target.value && setCustom({ ...custom, to: fromInput(e.target.value) })}
              aria-label="По дату"
              className={input}
            />
          </>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric title="Закрыто задач" value={String(report.closed.length)} note={`создано ${report.created.length}`} />
        <Metric title="Записано времени" value={formatSpent(report.time.total)} note={report.time.total ? `в среднем ${formatSpent(Math.round(report.time.total / days))} в день` : ''} />
        <Metric
          title="В срок"
          value={report.withDeadline.length ? `${report.onTime.length} из ${report.withDeadline.length}` : '—'}
          note="из закрытых с дедлайном"
        />
        <Metric
          title="Факт к плану"
          value={report.planSec ? `${Math.round((report.factSec / report.planSec) * 100)}%` : '—'}
          note={accuracy ?? 'нужны задачи с планом и таймером'}
        />
      </div>

      <div className={`mb-4 ${card}`}>
        <p className="mb-3 text-sm font-medium">Время по дням</p>
        {report.time.total === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">За этот период время не записывалось.</p>
        ) : (
          <div className="flex h-36 items-end gap-1">
            {chartDays.map((d) => {
              const sec = report.time.byDay.get(d) ?? 0
              const closedN = report.closedByDay.get(d) ?? 0
              return (
                <div
                  key={d}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  title={`${fmt(d, { weekday: 'short', day: 'numeric', month: 'long' })}: ${formatSpent(sec)}, закрыто ${closedN}`}
                >
                  <div
                    className={`w-full rounded-t ${sec ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                    style={{ height: `${sec ? Math.max(4, (sec / maxDay) * 100) : 3}%` }}
                  />
                  <span className="text-[10px] leading-none text-slate-500">
                    {chartDays.length <= 14 ? fmt(d, { weekday: 'short' }) : new Date(d).getDate()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <p className="mb-2 text-sm font-medium">По тегам</p>
          {report.tagRows.length === 0 ? (
            <p className="text-sm text-slate-400">Данных пока нет.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-1 font-normal">Тег</th>
                  <th className="pb-1 text-right font-normal">Закрыто</th>
                  <th className="pb-1 text-right font-normal">Время</th>
                </tr>
              </thead>
              <tbody>
                {report.tagRows.map(({ tag, closed, seconds }) => {
                  const def = tag ? TAGS.find((t) => t.id === tag) : undefined
                  return (
                    <tr key={tag ?? 'none'} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-xs ${def?.chip ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                          {def?.label ?? tag ?? 'без тега'}
                        </span>
                      </td>
                      <td className="py-1.5 text-right">{closed}</td>
                      <td className="py-1.5 text-right text-slate-500">{formatSpent(seconds)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className={card}>
          <p className="mb-2 text-sm font-medium">На что ушло время</p>
          {report.time.byTask.length === 0 ? (
            <p className="text-sm text-slate-400">Данных пока нет.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {report.time.byTask.slice(0, 8).map((t) => (
                <li key={t.key} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">{t.title || 'Без названия'}</span>
                  <span className="shrink-0 text-slate-500">{formatSpent(t.seconds)}</span>
                </li>
              ))}
              {report.time.byTask.length > 8 && (
                <li className="text-xs text-slate-400">и ещё {report.time.byTask.length - 8} — в выгрузке</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className={card}>
        <p className="mb-1 text-sm font-medium">Выгрузка за период ({label})</p>
        <p className="mb-3 text-xs text-slate-500">
          Файлы CSV открываются в Excel и Google Таблицах. Время указано в минутах.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportTasks}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Download size={16} /> Задачи (CSV)
          </button>
          <button
            onClick={exportDays}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Download size={16} /> Время по дням (CSV)
          </button>
        </div>
        {report.measured > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            План: {formatMinutes(Math.round(report.planSec / 60))}, факт: {formatMinutes(Math.round(report.factSec / 60))} (по {report.measured} закрытым задачам с планом).
          </p>
        )}
      </div>
    </div>
  )
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-medium">{value}</p>
      <p className="min-h-4 text-xs text-slate-400">{note}</p>
    </div>
  )
}
