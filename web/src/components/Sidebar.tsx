import {
  BarChart3,
  CalendarCheck,
  CalendarRange,
  ChevronDown,
  ListChecks,
  LogOut,
  Moon,
  StickyNote,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { TAGS } from '../tags'

export type View = 'today' | 'calendar' | 'tasks' | 'notes' | 'reports'

interface Props {
  view: View
  onView: (v: View) => void
  counts: { hot: number; soon: number }
  tagFilter: string[]
  onTag: (id: string) => void
  email: string
  theme: 'light' | 'dark'
  onTheme: () => void
  onSignOut: () => void
}

const ITEMS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Сегодня', icon: CalendarCheck },
  { id: 'calendar', label: 'Календарь', icon: CalendarRange },
  { id: 'tasks', label: 'Все задачи', icon: ListChecks },
  { id: 'notes', label: 'Заметки', icon: StickyNote },
  { id: 'reports', label: 'Отчёты', icon: BarChart3 },
]

export default function Sidebar({
  view,
  onView,
  counts,
  tagFilter,
  onTag,
  email,
  theme,
  onTheme,
  onSignOut,
}: Props) {
  const [tagsOpen, setTagsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:h-dvh lg:py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="px-2 text-xl font-bold tracking-tight">Планер</h1>

        <div className="flex items-center gap-1">
          <button
            onClick={onTheme}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="relative lg:hidden">
            <ProfileButton email={email} onClick={() => setMenuOpen(!menuOpen)} />
            {menuOpen && (
              <ProfileMenu email={email} onSignOut={onSignOut} className="right-0 top-full mt-1" />
            )}
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onView(id)}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
              view === id
                ? 'bg-slate-200/70 font-medium dark:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
            }`}
          >
            <Icon size={17} />
            <span className="flex-1 text-left">{label}</span>
            {id === 'tasks' && (
              <span className="flex gap-1 text-xs">
                {counts.hot > 0 && (
                  <span
                    title="Срок до 1 дня"
                    className="rounded-md bg-red-100 px-1.5 text-red-700 dark:bg-red-950 dark:text-red-300"
                  >
                    {counts.hot}
                  </span>
                )}
                {counts.soon > 0 && (
                  <span
                    title="Срок до 3 дней"
                    className="rounded-md bg-amber-100 px-1.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  >
                    {counts.soon}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="hidden lg:block">
        <button
          onClick={() => setTagsOpen(!tagsOpen)}
          className="flex w-full items-center gap-1.5 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          Фильтр по тегам
          {tagFilter.length > 0 && (
            <span className="rounded-md bg-indigo-100 px-1.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {tagFilter.length}
            </span>
          )}
          <ChevronDown size={13} className={`ml-auto transition ${tagsOpen ? 'rotate-180' : ''}`} />
        </button>
        {tagsOpen && (
          <div className="mt-1.5 flex flex-wrap gap-1.5 px-2">
            {TAGS.map((t) => (
              <button
                key={t.id}
                onClick={() => onTag(t.id)}
                className={`rounded-md px-2 py-0.5 text-xs transition ${t.chip} ${
                  tagFilter.includes(t.id) ? 'ring-2 ring-current' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative hidden lg:mt-auto lg:block">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-medium uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {email.slice(0, 1) || '?'}
          </span>
          <span className="min-w-0 flex-1 truncate">{email}</span>
        </button>
        {menuOpen && (
          <ProfileMenu email={email} onSignOut={onSignOut} className="bottom-full left-0 mb-1 w-full" />
        )}
      </div>
    </aside>
  )
}

function ProfileButton({ email, onClick }: { email: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Профиль"
      className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300"
    >
      {email.slice(0, 1) || '?'}
    </button>
  )
}

function ProfileMenu({
  email,
  onSignOut,
  className,
}: {
  email: string
  onSignOut: () => void
  className: string
}) {
  const item =
    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800'
  return (
    <div
      className={`absolute z-20 min-w-52 rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 ${className}`}
    >
      <p className="truncate px-2.5 py-1.5 text-xs text-slate-500">{email}</p>
      <button onClick={onSignOut} className={item}>
        <LogOut size={15} /> Выйти
      </button>
    </div>
  )
}
