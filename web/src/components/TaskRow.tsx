import { Check, ChevronDown, Flag, ListChecks, Pause, Play, Repeat, Timer } from 'lucide-react'
import { useState } from 'react'
import { bucketOf, formatDue, formatMinutes, formatSpent, totalSpentSec } from '../dates'
import { describeRecurrence } from '../recurrence'
import { tagById } from '../tags'
import type { ChecklistItem, Task } from '../types'

interface Props {
  task: Task
  now: number
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onStart: (id: string) => void
  onPause: (id: string) => void
  onChecklist: (id: string, items: ChecklistItem[]) => void
}

const DUE_TEXT = {
  hot: 'text-red-600 dark:text-red-400',
  soon: 'text-amber-600 dark:text-amber-400',
  later: 'text-slate-500',
  none: 'text-slate-500',
} as const

/**
 * Одна строка на задачу: название, срок и затраченное время.
 * Остальное (описание, день в плане, чеклист, повтор) — в окне задачи по нажатию.
 */
export default function TaskRow({ task, now, onToggle, onEdit, onStart, onPause, onChecklist }: Props) {
  const [open, setOpen] = useState(false)
  const isTask = task.kind === 'task'
  const bucket = bucketOf(task, now)
  const running = task.timerStartedAt !== null
  const spentSec = totalSpentSec(task, now)
  const overdue = task.dueAt !== null && !task.done && new Date(task.dueAt).getTime() < now
  const total = task.checklist.length
  const doneItems = task.checklist.filter((i) => i.done).length
  const allChecked = total > 0 && doneItems === total

  const toggleItem = (id: string) =>
    onChecklist(
      task.id,
      task.checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    )

  return (
    <li
      className={`group flex items-start gap-3 border-t border-slate-200 py-2.5 first:border-t-0 dark:border-slate-800 ${
        running ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''
      }`}
    >
      {isTask ? (
        <button
          onClick={() => onToggle(task.id)}
          aria-label={task.done ? 'Вернуть в работу' : 'Отметить выполненной'}
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition ${
            task.done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 hover:border-indigo-500 dark:border-slate-600'
          }`}
        >
          {task.done && <Check size={13} strokeWidth={3} />}
        </button>
      ) : (
        <span className="mt-0.5 size-5 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <button
          onClick={() => onEdit(task.id)}
          className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 text-left"
        >
          <span className={`min-w-0 flex-1 break-words ${task.done ? 'text-slate-400 line-through' : ''}`}>
            {running && (
              <span
                className="mr-1.5 inline-block size-2 -translate-y-px animate-pulse rounded-full bg-indigo-500"
                title="Таймер идёт"
              />
            )}
            {task.priority > 0 && !task.done && (
              <Flag
                size={13}
                className="mr-1 inline -translate-y-px text-slate-500"
                aria-label={task.priority === 2 ? 'Очень важное' : 'Важное'}
              />
            )}
            {task.title}
            {task.tags.map((id) => {
              const tag = tagById(id)
              return tag ? (
                <span
                  key={id}
                  className={`ml-1.5 inline-block size-2 -translate-y-px rounded-full ${tag.dot}`}
                  title={tag.label}
                />
              ) : null
            })}
          </span>

          <span className="flex shrink-0 items-center gap-3 text-xs">
            {task.recurrence && (
              <span title={describeRecurrence(task.recurrence)} className="text-slate-400">
                <Repeat size={13} />
              </span>
            )}
            {isTask && task.dueAt && (
              <span className={DUE_TEXT[bucket === 'none' ? 'later' : bucket]}>
                {overdue ? 'просрочено · ' : ''}
                {formatDue(task.dueAt, now)}
              </span>
            )}
            {isTask && (spentSec > 0 || task.plannedMin !== null) && (
              <span
                className={`inline-flex items-center gap-1 ${
                  spentSec > 0
                    ? 'font-medium text-slate-700 dark:text-slate-200'
                    : 'text-slate-400'
                }`}
                title="Затрачено времени"
              >
                <Timer size={13} />
                {spentSec > 0
                  ? `${formatSpent(spentSec)}${task.plannedMin !== null ? ` / ${formatMinutes(task.plannedMin)}` : ''}`
                  : `план ${formatMinutes(task.plannedMin ?? 0)}`}
              </span>
            )}
          </span>
        </button>

        {total > 0 && (
          <div className="mt-1">
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ListChecks size={13} />
              {doneItems} из {total}
              <span className="h-1 w-14 rounded-full bg-slate-200 dark:bg-slate-700">
                <span
                  className="block h-1 rounded-full bg-emerald-500"
                  style={{ width: `${Math.round((doneItems / total) * 100)}%` }}
                />
              </span>
              <ChevronDown size={13} className={`transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <ul className="mt-1 space-y-1">
                {task.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleItem(item.id)}
                      aria-label="Пункт выполнен"
                      className="size-4 shrink-0 accent-emerald-600"
                    />
                    <span className={item.done ? 'text-slate-400 line-through' : ''}>{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {allChecked && !task.done && isTask && (
              <p className="mt-1 text-xs text-slate-500">
                Все пункты готовы.{' '}
                <button
                  onClick={() => onToggle(task.id)}
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Закрыть задачу
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {isTask && !task.done && (
        <button
          onClick={() => (running ? onPause(task.id) : onStart(task.id))}
          aria-label={running ? 'Поставить таймер на паузу' : 'Запустить таймер'}
          className={`mt-0.5 shrink-0 rounded-md p-1.5 transition ${
            running
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600 focus:opacity-100 dark:hover:bg-slate-800 lg:opacity-0 lg:group-hover:opacity-100'
          }`}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
      )}
    </li>
  )
}
