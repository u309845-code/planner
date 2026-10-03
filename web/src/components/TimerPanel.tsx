import { Pause } from 'lucide-react'
import { formatClock, formatMinutes, totalSpentSec } from '../dates'
import type { Task } from '../types'

interface Props {
  task: Task | undefined
  now: number
  onPause: (id: string) => void
}

export default function TimerPanel({ task, now, onPause }: Props) {
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
          <button
            onClick={() => onPause(task.id)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Pause size={16} /> Пауза
          </button>
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          Таймер не запущен. Нажмите ▶ у задачи, чтобы засечь время.
        </p>
      )}
    </div>
  )
}
