import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { NewTask, Patch, Task } from '../types'

interface Props {
  notes: Task[]
  onAdd: (t: NewTask) => Promise<Task | undefined>
  onPatch: (id: string, p: Patch) => void
  onRemove: (id: string) => void
}

const preview = (n: Task) =>
  n.title.trim() || n.notes.trim().split('\n')[0] || 'Без названия'

export default function NotesView({ notes, onAdd, onPatch, onRemove }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = notes.find((n) => n.id === selectedId) ?? notes[0]

  async function create() {
    const note = await onAdd({ title: '', kind: 'note' })
    if (note) setSelectedId(note.id)
  }

  return (
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <button
          onClick={() => void create()}
          className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <Plus size={16} /> Новая заметка
        </button>
        {notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Заметок пока нет.</p>
        ) : (
          <ul className="max-h-[60dvh] space-y-1 overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => setSelectedId(n.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    n.id === selected?.id
                      ? 'bg-slate-200/70 dark:bg-slate-800'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="block truncate font-medium">{preview(n)}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {new Date(n.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {n.title.trim() && n.notes.trim() ? ` · ${n.notes.trim().split('\n')[0]}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? (
        <NoteEditor key={selected.id} note={selected} onPatch={onPatch} onRemove={onRemove} />
      ) : (
        <p className="py-12 text-center text-sm text-slate-400">
          Нажмите «Новая заметка», чтобы записать мысль.
        </p>
      )}
    </div>
  )
}

function NoteEditor({
  note,
  onPatch,
  onRemove,
}: {
  note: Task
  onPatch: (id: string, p: Patch) => void
  onRemove: (id: string) => void
}) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.notes)
  const [saved, setSaved] = useState(true)

  // Автосохранение с задержкой; при переключении на другую заметку несохранённое дописывается.
  const latest = useRef({ title, notes: body })
  const dirty = useRef(false)
  const patchRef = useRef(onPatch)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    patchRef.current = onPatch
  })

  useEffect(() => {
    const id = note.id
    return () => {
      clearTimeout(timer.current)
      if (dirty.current) patchRef.current(id, latest.current)
    }
  }, [note.id])

  function change(nextTitle: string, nextBody: string) {
    setTitle(nextTitle)
    setBody(nextBody)
    setSaved(false)
    latest.current = { title: nextTitle, notes: nextBody }
    dirty.current = true
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onPatch(note.id, latest.current)
      dirty.current = false
      setSaved(true)
    }, 700)
  }

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <input
        value={title}
        onChange={(e) => change(e.target.value, body)}
        placeholder="Название"
        autoFocus={!note.title && !note.notes}
        className="mb-2 w-full bg-transparent text-xl font-semibold outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
      />
      <textarea
        value={body}
        onChange={(e) => change(title, e.target.value)}
        placeholder="Пишите здесь…"
        className="min-h-[50dvh] w-full resize-y bg-transparent text-base leading-relaxed outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
      />
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-800">
        <span>{saved ? 'Сохранено' : 'Сохраняется…'}</span>
        <button
          onClick={() => {
            if (window.confirm('Удалить заметку?')) {
              dirty.current = false
              onRemove(note.id)
            }
          }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 size={14} /> Удалить
        </button>
      </div>
    </div>
  )
}
