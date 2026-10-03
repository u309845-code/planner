import { CheckCheck, Pause } from 'lucide-react'
import { formatClock, totalSpentSec } from '../dates'
import type { Task } from '../types'

interface Props {
  task: Task
  now: number
  onPause: (id: string) => void
  onFinish: (id: string) => void
}

/** Компактный таймер для экранов без правой панели (например, «Неделя»). */
export default function TimerBar({ task, now, onPause, onFinish }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-2.5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <span className="size-2 animate-pulse rounded-full bg-indigo-500" />
      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
      <span className="text-lg font-medium tabular-nums">{formatClock(totalSpentSec(task, now))}</span>
      <button
        onClick={() => onPause(task.id)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <Pause size={14} /> Пауза
      </button>
      <button
        onClick={() => onFinish(task.id)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        <CheckCheck size={14} /> Завершить
      </button>
    </div>
  )
}
