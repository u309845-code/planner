import { Check, Flag, Pause, Play, Timer } from 'lucide-react'
import { bucketOf, formatDue, formatMinutes, formatSpent, totalSpentSec } from '../dates'
import { tagById } from '../tags'
import type { Task } from '../types'

interface Props {
  task: Task
  now: number
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onStart: (id: string) => void
  onPause: (id: string) => void
}

const DUE_STYLE = {
  hot: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  soon: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  later: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  none: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
} as const

export default function TaskRow({ task, now, onToggle, onEdit, onStart, onPause }: Props) {
  const isTask = task.kind === 'task'
  const bucket = bucketOf(task, now)
  const running = task.timerStartedAt !== null
  const spentSec = totalSpentSec(task, now)
  const overdue = task.dueAt !== null && !task.done && new Date(task.dueAt).getTime() < now

  return (
    <li className="flex items-start gap-3 border-t border-slate-200 py-2.5 first:border-t-0 dark:border-slate-800">
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

      <button onClick={() => onEdit(task.id)} className="min-w-0 flex-1 text-left">
        <p className={`break-words ${task.done ? 'text-slate-400 line-through' : ''}`}>
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
          {isTask && (task.plannedMin !== null || spentSec > 0) && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Timer size={12} />
              {spentSec > 0
                ? `затрачено ${formatSpent(spentSec)}${task.plannedMin !== null ? ` из ${formatMinutes(task.plannedMin)}` : ''}`
                : `план ${formatMinutes(task.plannedMin ?? 0)}`}
            </span>
          )}
        </div>
      </button>

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
