import { Flag, ListChecks, Repeat, Timer } from 'lucide-react'
import type { DragEvent } from 'react'
import {
  bucketOf,
  dayStartMs,
  formatDue,
  formatMinutes,
  formatSpent,
  fromDateKey,
  totalSpentSec,
} from '../dates'
import { tagById } from '../tags'
import type { Task } from '../types'

interface Props {
  task: Task
  now: number
  dragging?: boolean
  onDragStart?: (e: DragEvent) => void
  onDragEnd?: () => void
  onEdit: (id: string) => void
  onToggle: (id: string) => void
}

/** Компактная карточка задачи для досок и календаря. */
export default function TaskCard({
  task: t,
  now,
  dragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onToggle,
}: Props) {
  const bucket = bucketOf(t, now)
  const tone =
    bucket === 'hot'
      ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
      : bucket === 'soon'
        ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
  const planPassed = t.planDate && !t.done && fromDateKey(t.planDate) < dayStartMs(now)
  const doneItems = t.checklist.filter((i) => i.done).length
  const spentSec = totalSpentSec(t, now)

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-xl border p-2 text-sm ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''} ${tone} ${
        dragging ? 'opacity-40' : ''
      } ${t.done ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => onToggle(t.id)}
          aria-label="Выполнено"
          className="mt-0.5 size-4 shrink-0 accent-emerald-600"
        />
        <button onClick={() => onEdit(t.id)} className="min-w-0 flex-1 text-left">
          <span className={`block break-words leading-snug ${t.done ? 'line-through' : ''}`}>
            {t.priority > 0 && !t.done && (
              <Flag size={12} className="mr-1 inline -translate-y-px text-slate-500" />
            )}
            {t.title}
          </span>
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pl-6 text-[11px] text-slate-500">
        {t.tags.map((id) => {
          const tag = tagById(id)
          return tag ? <span key={id} className={`size-2 rounded-full ${tag.dot}`} title={tag.label} /> : null
        })}
        {t.dueAt && !t.done && (
          <span
            className={
              bucket === 'hot'
                ? 'text-red-600 dark:text-red-400'
                : bucket === 'soon'
                  ? 'text-amber-600 dark:text-amber-400'
                  : ''
            }
          >
            {formatDue(t.dueAt, now)}
          </span>
        )}
        {spentSec > 0 ? (
          <span className="inline-flex items-center gap-0.5 font-medium text-slate-700 dark:text-slate-200">
            <Timer size={11} /> {formatSpent(spentSec)}
            {t.plannedMin !== null && ` / ${formatMinutes(t.plannedMin)}`}
          </span>
        ) : (
          t.plannedMin !== null && <span>план {formatMinutes(t.plannedMin)}</span>
        )}
        {t.checklist.length > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <ListChecks size={11} /> {doneItems}/{t.checklist.length}
          </span>
        )}
        {t.recurrence && <Repeat size={11} aria-label="Повторяется" />}
        {planPassed && <span className="text-red-500">· план прошёл</span>}
      </div>
    </div>
  )
}
