import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { bucketOf, byDue, endOfDay, formatDue } from '../dates'
import type { Task } from '../types'
import TaskCard from './TaskCard'

type Col = 'hot' | 'soon' | 'later' | 'nodate'

interface Props {
  /** Задачи (kind = task), уже отфильтрованные по тегам */
  tasks: Task[]
  now: number
  onEdit: (id: string) => void
  onToggle: (id: string) => void
  onSetDue: (id: string, dueAt: string | null) => void
  onQuickAdd: (title: string) => void
  onNew: () => void
}

const COLS: { id: Col; title: string; style: string }[] = [
  { id: 'hot', title: 'До 1 дня', style: 'text-red-600 dark:text-red-400' },
  { id: 'soon', title: 'До 3 дней', style: 'text-amber-600 dark:text-amber-400' },
  { id: 'later', title: 'Позже', style: 'text-slate-700 dark:text-slate-200' },
  { id: 'nodate', title: 'Без срока', style: 'text-slate-700 dark:text-slate-200' },
]

/** Новый дедлайн при переносе карточки в колонку: время суток сохраняем, иначе 18:00. */
function dueForColumn(col: Col, prev: string | null, now: number): string | null {
  if (col === 'nodate') return null
  const keep = prev ? new Date(prev) : null
  const hh = keep ? keep.getHours() : 18
  const mm = keep ? keep.getMinutes() : 0
  const d = new Date(now)
  if (col === 'hot') {
    d.setHours(hh, mm, 0, 0)
    const t = Math.min(Math.max(d.getTime(), now + 3_600_000), endOfDay(now))
    return new Date(t).toISOString()
  }
  d.setDate(d.getDate() + (col === 'soon' ? 2 : 7))
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

export default function TasksBoard({ tasks, now, onEdit, onToggle, onSetDue, onQuickAdd, onNew }: Props) {
  const [query, setQuery] = useState('')
  const [quick, setQuick] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [onlyRecurring, setOnlyRecurring] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<Col | null>(null)
  const [undo, setUndo] = useState<{ id: string; prev: string | null; text: string } | null>(null)

  useEffect(() => {
    if (!undo) return
    const id = setTimeout(() => setUndo(null), 8000)
    return () => clearTimeout(id)
  }, [undo])

  const columns = useMemo(() => {
    const q = query.trim().toLowerCase()
    const visible = tasks.filter(
      (t) =>
        (!onlyRecurring || t.recurrence) &&
        (!q || t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q)),
    )
    const open = visible.filter((t) => !t.done)
    return {
      hot: open.filter((t) => bucketOf(t, now) === 'hot').sort(byDue),
      soon: open.filter((t) => bucketOf(t, now) === 'soon').sort(byDue),
      later: open.filter((t) => bucketOf(t, now) === 'later').sort(byDue),
      nodate: open.filter((t) => !t.dueAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      done: visible
        .filter((t) => t.done)
        .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
        .slice(0, 30),
    }
  }, [tasks, query, onlyRecurring, now])

  function submitQuick(e: FormEvent) {
    e.preventDefault()
    const title = quick.trim()
    if (!title) return
    onQuickAdd(title)
    setQuick('')
  }

  function drop(e: DragEvent, col: Col) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setOver(null)
    setDragging(null)
    const t = tasks.find((x) => x.id === id)
    if (!t || t.done || bucketOfColumn(t, now) === col) return
    const next = dueForColumn(col, t.dueAt, now)
    onSetDue(id, next)
    setUndo({
      id,
      prev: t.dueAt,
      text: `«${t.title}»: ${next ? 'дедлайн ' + formatDue(next, now) : 'дедлайн убран'}`,
    })
  }

  const gridCols = showDone ? 'xl:grid-cols-5' : 'xl:grid-cols-4'

  return (
    <div>
      <form
        onSubmit={submitQuick}
        className="mb-3 flex items-center gap-2 rounded-2xl bg-white p-2 pl-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-800"
      >
        <Plus size={18} className="shrink-0 text-slate-400" />
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="Что нужно сделать?"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          Добавить
        </button>
        <button
          type="button"
          onClick={onNew}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          С деталями
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex min-w-40 flex-1 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-800">
          <Search size={15} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по задачам"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
          />
        </label>
        <Chip on={onlyRecurring} onClick={() => setOnlyRecurring(!onlyRecurring)}>
          Регулярные
        </Chip>
        <Chip on={showDone} onClick={() => setShowDone(!showDone)}>
          Выполненные
        </Chip>
      </div>

      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${gridCols}`}>
        {COLS.map((c) => (
          <section
            key={c.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(c.id)
            }}
            onDragLeave={() => setOver((o) => (o === c.id ? null : o))}
            onDrop={(e) => drop(e, c.id)}
            className={`min-h-40 min-w-0 rounded-2xl p-2 ring-1 transition ${
              over === c.id
                ? 'bg-indigo-50 ring-2 ring-indigo-400 dark:bg-indigo-950/40'
                : 'bg-slate-100/60 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-800'
            }`}
          >
            <h3 className={`mb-2 flex items-baseline justify-between px-1 text-sm font-medium ${c.style}`}>
              {c.title}
              <span className="text-xs font-normal text-slate-500">{columns[c.id].length}</span>
            </h3>
            <div className="space-y-1.5">
              {columns[c.id].map((t) => (
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
              ))}
              {columns[c.id].length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-slate-400">Пусто</p>
              )}
            </div>
          </section>
        ))}

        {showDone && (
          <section className="min-h-40 min-w-0 rounded-2xl bg-slate-100/60 p-2 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-800">
            <h3 className="mb-2 flex items-baseline justify-between px-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Выполнено
              <span className="text-xs font-normal text-slate-500">{columns.done.length}</span>
            </h3>
            <div className="space-y-1.5">
              {columns.done.map((t) => (
                <TaskCard key={t.id} task={t} now={now} onEdit={onEdit} onToggle={onToggle} />
              ))}
              {columns.done.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-slate-400">Пусто</p>
              )}
            </div>
          </section>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Перетащите карточку в другую колонку, чтобы изменить дедлайн: «До 1 дня» — сегодня, «До 3 дней» —
        через 2 дня, «Позже» — через неделю, «Без срока» — убрать.
      </p>

      {undo && (
        <div className="fixed bottom-24 left-1/2 z-30 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          <span className="truncate">{undo.text}</span>
          <button
            onClick={() => {
              onSetDue(undo.id, undo.prev)
              setUndo(null)
            }}
            className="shrink-0 font-medium text-indigo-300 hover:underline dark:text-indigo-600"
          >
            Отменить
          </button>
        </div>
      )}
    </div>
  )
}

function bucketOfColumn(t: Task, now: number): Col {
  const b = bucketOf(t, now)
  return b === 'hot' || b === 'soon' || b === 'later' ? b : 'nodate'
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        on
          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          : 'bg-white ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-800'
      }`}
    >
      {children}
    </button>
  )
}
