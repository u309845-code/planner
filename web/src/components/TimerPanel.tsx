import { CheckCheck, Pause } from 'lucide-react'
import { formatClock, formatMinutes, formatSpent, totalSpentSec } from '../dates'
import type { Task } from '../types'

interface Props {
  task: Task | undefined
  now: number
  /** Сколько всего времени записано за сегодня, секунд */
  todaySec: number
  onPause: (id: string) => void
  onFinish: (id: string) => void
}

export default function TimerPanel({ task, now, todaySec, onPause, onFinish }: Props) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="text-xs text-slate-500">Сейчас в работе</p>
      {task ? (
        <>
          <p className="mt-1 break-words text-sm">{task.title}</p>
          <p className="my-2 text-3xl font-medium tabular-nums">
            {formatClock(totalSpentSec(task, now))}
          </p>
          {task.plannedMin !== null && (
            <p className="mb-3 text-xs text-slate-500">план {formatMinutes(task.plannedMin)}</p>
          )}
          <div className="grid gap-2">
            <button
              onClick={() => onPause(task.id)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <Pause size={16} /> Пауза
            </button>
            <button
              onClick={() => onFinish(task.id)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <CheckCheck size={16} /> Завершить
            </button>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          Таймер не запущен. Нажмите ▶ у задачи, чтобы засечь время.
        </p>
      )}
      <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800">
        Сегодня записано: {formatSpent(todaySec)}
      </p>
    </div>
  )
}
