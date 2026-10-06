import { CalendarDays, Check, ChevronDown, Flag, ListChecks, Pause, Play, Repeat, Timer } from 'lucide-react'
import { useState } from 'react'
import {
  bucketOf,
  formatDue,
  formatMinutes,
  formatSpent,
  fromDateKey,
  totalSpentSec,
} from '../dates'
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

const DUE_STYLE = {
  hot: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  soon: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  later: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  none: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
} as const

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
      className={`flex items-start gap-3 border-t border-slate-200 py-2.5 first:border-t-0 dark:border-slate-800 ${
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
        <button onClick={() => onEdit(task.id)} className="block w-full text-left">
          <p className={`break-words ${task.done ? 'text-slate-400 line-through' : ''}`}>
            {running && (
              <span
                className="mr-1.5 inline-block size-2 -translate-y-px animate-pulse rounded-full bg-indigo-500"
                title="Таймер идёт"
              />
            )}
            {task.priority > 0 && !task.done && (
              <Flag
                size={14}
                className={`mr-1 inline -translate-y-px ${task.priority === 2 ? 'text-red-500' : 'text-amber-500'}`}
                aria-label="Важное"
              />
            )}
            {task.title}
          </p>
          {task.notes && (
            <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-sm text-slate-500">
              {task.notes}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            {task.tags.map((id) => {
              const tag = tagById(id)
              return tag ? (
                <span key={id} className={`rounded-md px-2 py-0.5 ${tag.chip}`}>
                  {tag.label}
                </span>
              ) : null
            })}
            {isTask && task.dueAt && (
              <span className={`rounded-md px-2 py-0.5 ${DUE_STYLE[bucket === 'none' ? 'later' : bucket]}`}>
                {overdue ? 'просрочено · ' : ''}
                {formatDue(task.dueAt, now)}
              </span>
            )}
            {isTask && task.planDate && !task.done && (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <CalendarDays size={12} />
                {new Date(fromDateKey(task.planDate)).toLocaleDateString('ru-RU', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}
            {isTask && (task.plannedMin !== null || spentSec > 0) && (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Timer size={12} />
                {spentSec > 0
                  ? `затрачено ${formatSpent(spentSec)}${task.plannedMin !== null ? ` из ${formatMinutes(task.plannedMin)}` : ''}`
                  : `план ${formatMinutes(task.plannedMin ?? 0)}`}
              </span>
            )}
            {task.recurrence && (
              <span
                className="inline-flex items-center gap-1 text-slate-500"
                title={describeRecurrence(task.recurrence)}
              >
                <Repeat size={12} />
                {describeRecurrence(task.recurrence)}
              </span>
            )}
          </div>
        </button>

        {total > 0 && (
          <div className="mt-1.5">
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ListChecks size={13} />
              {doneItems} из {total}
              <span className="h-1 w-16 rounded-full bg-slate-200 dark:bg-slate-700">
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
              : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800'
          }`}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
      )}
    </li>
  )
}
