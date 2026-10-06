import { CheckCheck, Pause } from 'lucide-react'
import { formatClock, formatMinutes, runningSec, totalSpentSec } from '../dates'
import type { Task } from '../types'

interface Props {
  task: Task
  now: number
  onPause: (id: string) => void
  onFinish: (id: string) => void
}

const LONG_RUN_SEC = 90 * 60

/** Полоса внизу экрана: видна только пока идёт таймер. */
export default function RunningBar({ task, now, onPause, onFinish }: Props) {
  const longRun = runningSec(task, now) >= LONG_RUN_SEC
  return (
    <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-3 shadow-lg ring-1 ring-slate-300 dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex flex-wrap items-center gap-3">
          <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-indigo-500" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
          {task.plannedMin !== null && (
            <span className="hidden text-xs text-slate-500 sm:inline">
              план {formatMinutes(task.plannedMin)}
            </span>
          )}
          <span className="text-lg font-medium tabular-nums">
            {formatClock(totalSpentSec(task, now))}
          </span>
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
        {longRun && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Таймер идёт уже больше полутора часов. Не забыли его выключить?
          </p>
        )}
      </div>
    </div>
  )
}
