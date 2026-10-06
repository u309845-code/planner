interface Props<T extends string> {
  value: T
  options: { id: T; label: string }[]
  onChange: (id: T) => void
}

/** Переключатель вкладок: «Неделя | Месяц». */
export default function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <div className="inline-flex rounded-lg bg-slate-200/60 p-0.5 text-sm dark:bg-slate-900">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-md px-3 py-1 transition ${
            value === o.id ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
