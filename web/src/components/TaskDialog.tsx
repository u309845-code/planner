import { ChevronDown, Plus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { formatDayLabel, formatSpent, isoToLocalInput, localInputToIso } from '../dates'
import { TAGS } from '../tags'
import type { ChecklistItem, Priority, Recurrence, Task } from '../types'

export interface TaskForm {
  title: string
  notes: string
  dueAt: string | null
  planDate: string | null
  plannedMin: number | null
  priority: Priority
  tags: string[]
  checklist: ChecklistItem[]
  recurrence: Recurrence | null
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

const FREQS = [
  { value: '', label: 'Не повторять' },
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekdays', label: 'По будням' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'monthly', label: 'Каждый месяц' },
] as const

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

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
  const [checklist, setChecklist] = useState<ChecklistItem[]>(init?.checklist ?? [])
  const [newItem, setNewItem] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence | null>(init?.recurrence ?? null)
  // «Ещё» открыто сразу, если у задачи уже заполнены дополнительные поля
  const [more, setMore] = useState(
    !!task &&
      (!!task.notes ||
        task.checklist.length > 0 ||
        task.plannedMin !== null ||
        !!task.planDate ||
        task.priority > 0 ||
        !!task.recurrence),
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function addItem() {
    const text = newItem.trim()
    if (!text) return
    setChecklist((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }])
    setNewItem('')
  }

  function setFreq(value: string) {
    if (!value) return setRecurrence(null)
    if (value === 'weekly') {
      const base = due ? new Date(due) : planDay ? new Date(planDay + 'T00:00') : new Date(now)
      return setRecurrence({ freq: 'weekly', days: [(base.getDay() + 6) % 7] })
    }
    setRecurrence({ freq: value } as Recurrence)
  }

  function toggleWeekday(d: number) {
    setRecurrence((r) => {
      if (r?.freq !== 'weekly') return r
      const next = r.days.includes(d) ? r.days.filter((x) => x !== d) : [...r.days, d]
      return { freq: 'weekly', days: next.length ? next : r.days }
    })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const planNum = plan.trim() === '' ? NaN : Math.max(0, Math.round(Number(plan)))
    // недописанный пункт чеклиста не теряем
    const pending = newItem.trim()
    onSubmit({
      title: trimmed,
      notes: notes.trim(),
      dueAt: localInputToIso(due),
      planDate: planDay || null,
      plannedMin: Number.isNaN(planNum) ? null : planNum,
      priority,
      tags,
      checklist: pending
        ? [...checklist, { id: crypto.randomUUID(), text: pending, done: false }]
        : checklist,
      recurrence,
    })
    onClose()
  }

  const toggleTag = (id: string) =>
    setTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const totalSec = days?.reduce((sum, d) => sum + d.seconds, 0) ?? 0

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
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

        <label className="block space-y-1 text-xs text-slate-500">
          Дедлайн
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={field}
          />
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

        <button
          type="button"
          onClick={() => setMore(!more)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {more ? 'Скрыть' : 'Ещё: описание, чеклист, повтор, план'}
          <ChevronDown size={14} className={`transition ${more ? 'rotate-180' : ''}`} />
        </button>

        {more && (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Описание"
              rows={3}
              className={`${field} resize-none`}
            />

            <div>
              <p className="mb-1 text-xs text-slate-500">
                Чеклист
                {checklist.length > 0 &&
                  ` · ${checklist.filter((i) => i.done).length} из ${checklist.length}`}
              </p>
              <ul className="space-y-1">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() =>
                        setChecklist((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)),
                        )
                      }
                      aria-label="Пункт выполнен"
                      className="size-4 shrink-0 accent-emerald-600"
                    />
                    <input
                      value={item.text}
                      onChange={(e) =>
                        setChecklist((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i)),
                        )
                      }
                      className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                        item.done ? 'text-slate-400 line-through' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setChecklist((prev) => prev.filter((i) => i.id !== item.id))}
                      aria-label="Удалить пункт"
                      className="rounded p-1 text-slate-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem()
                    }
                  }}
                  placeholder="Добавить пункт"
                  className={field}
                />
                <button
                  type="button"
                  onClick={addItem}
                  aria-label="Добавить пункт"
                  className="shrink-0 rounded-lg bg-slate-100 p-2 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <label className="space-y-1 text-xs text-slate-500">
                День в плане
                <input
                  type="date"
                  value={planDay}
                  onChange={(e) => setPlanDay(e.target.value)}
                  className={field}
                />
              </label>
            </div>

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
              <label className="block space-y-1 text-xs text-slate-500">
                Повтор
                <select
                  value={recurrence?.freq ?? ''}
                  onChange={(e) => setFreq(e.target.value)}
                  className={field}
                >
                  {FREQS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              {recurrence?.freq === 'weekly' && (
                <div className="mt-2 flex gap-1">
                  {WEEKDAYS.map((name, d) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleWeekday(d)}
                      className={`flex-1 rounded-md py-1 text-xs transition ${
                        recurrence.days.includes(d)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              {recurrence && (
                <p className="mt-1 text-xs text-slate-400">
                  Когда вы закроете задачу, появится следующая с новым сроком.
                </p>
              )}
            </div>
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
