import { useEffect, useState, type FormEvent } from 'react'
import { isoToLocalInput, localInputToIso } from '../dates'
import { TAGS } from '../tags'
import type { Patch, Priority, Task } from '../types'

interface Props {
  task: Task
  onSave: (id: string, p: Patch) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 0, label: 'Обычный' },
  { value: 1, label: 'Важный' },
  { value: 2, label: 'Очень важный' },
]

const field =
  'w-full rounded-lg bg-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-slate-800'

export default function EditDialog({ task, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [due, setDue] = useState(isoToLocalInput(task.dueAt))
  const [plan, setPlan] = useState(task.plannedMin === null ? '' : String(task.plannedMin))
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [tags, setTags] = useState<string[]>(task.tags)
  const isTask = task.kind === 'task'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const planNum = plan.trim() === '' ? null : Math.max(0, Math.round(Number(plan)))
    onSave(task.id, {
      title: trimmed,
      notes: notes.trim(),
      dueAt: isTask ? localInputToIso(due) : null,
      plannedMin: isTask && planNum !== null && !Number.isNaN(planNum) ? planNum : null,
      priority,
      tags,
    })
    onClose()
  }

  const toggleTag = (id: string) =>
    setTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900"
      >
        <h2 className="text-lg font-semibold">{isTask ? 'Задача' : 'Заметка'}</h2>
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
          placeholder="Заметка"
          rows={4}
          className={`${field} resize-none`}
        />

        {isTask && (
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
        )}

        <label className="block space-y-1 text-xs text-slate-500">
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

        <div className="flex items-center justify-between pt-2">
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
              Сохранить
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
