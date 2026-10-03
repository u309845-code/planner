import { useEffect, useState, type FormEvent } from 'react'
import { formatDayLabel, formatSpent, isoToLocalInput, localInputToIso } from '../dates'
import { TAGS } from '../tags'
import type { Priority, Task } from '../types'

export interface TaskForm {
  title: string
  notes: string
  dueAt: string | null
  planDate: string | null
  plannedMin: number | null
  priority: Priority
  tags: string[]
}

interface Props {
  /** Есть — редактирование, нет — создание */
  task?: Task
  defaults?: Partial<TaskForm>
  /** Время по дням (только для редактирования) */
  days?: { day: number; seconds: number }[]
  now: number
  onSubmit: (form: TaskForm) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 0, label: 'Обычный' },
  { value: 1, label: 'Важный' },
  { value: 2, label: 'Очень важный' },
]

const field =
  'w-full rounded-lg bg-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-slate-800'

export default function TaskDialog({ task, defaults, days, now, onSubmit, onDelete, onClose }: Props) {
  const init = task ?? defaults
  const [title, setTitle] = useState(init?.title ?? '')
  const [notes, setNotes] = useState(init?.notes ?? '')
  const [due, setDue] = useState(isoToLocalInput(init?.dueAt ?? null))
  const [planDay, setPlanDay] = useState(init?.planDate ?? '')
  const [plan, setPlan] = useState(init?.plannedMin == null ? '' : String(init.plannedMin))
  const [priority, setPriority] = useState<Priority>(init?.priority ?? 0)
  const [tags, setTags] = useState<string[]>(init?.tags ?? [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const planNum = plan.trim() === '' ? NaN : Math.max(0, Math.round(Number(plan)))
    onSubmit({
      title: trimmed,
      notes: notes.trim(),
      dueAt: localInputToIso(due),
      planDate: planDay || null,
      plannedMin: Number.isNaN(planNum) ? null : planNum,
      priority,
      tags,
    })
    onClose()
  }

  const toggleTag = (id: string) =>
    setTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const totalSec = days?.reduce((sum, d) => sum + d.seconds, 0) ?? 0

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900"
      >
        <h2 className="text-lg font-semibold">{task ? 'Задача' : 'Новая задача'}</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название"
          autoFocus
          className={field}
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Описание"
          rows={3}
          className={`${field} resize-none`}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-slate-500">
            Дедлайн
            <input
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={field}
            />
          </label>
          <label className="space-y-1 text-xs text-slate-500">
            План, минут
            <input
              type="number"
              min={0}
              step={5}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className={field}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-slate-500">
            День в плане
            <input
              type="date"
              value={planDay}
              onChange={(e) => setPlanDay(e.target.value)}
              className={field}
            />
          </label>
          <label className="space-y-1 text-xs text-slate-500">
            Приоритет
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as Priority)}
              className={field}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className="mb-1 text-xs text-slate-500">Теги</p>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={`rounded-md px-2 py-1 text-xs transition ${
                  tags.includes(t.id)
                    ? t.chip + ' ring-2 ring-current'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {task && days && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
            <p className="font-medium">Затрачено: {formatSpent(totalSec)}</p>
            {days.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                {days.slice(0, 7).map((d) => (
                  <li key={d.day} className="flex justify-between">
                    <span>{formatDayLabel(d.day, now)}</span>
                    <span>{formatSpent(d.seconds)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Таймер по этой задаче ещё не запускали.</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {task && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(task.id)
                onClose()
              }}
              className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Удалить
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              {task ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
