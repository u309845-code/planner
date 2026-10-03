import {
  BarChart3,
  CalendarCheck,
  CheckCheck,
  Clock,
  Flame,
  LogOut,
  Moon,
  StickyNote,
  Sun,
  Timer,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { TAGS } from '../tags'

export type View = 'today' | 'hot' | 'soon' | 'quick' | 'notes' | 'time' | 'reports' | 'done'

interface Props {
  view: View
  onView: (v: View) => void
  counts: { hot: number; soon: number; quick: number }
  tagFilter: string[]
  onTag: (id: string) => void
  email: string
  theme: 'light' | 'dark'
  onTheme: () => void
  onSignOut: () => void
}

const ITEMS: { id: View; label: string; icon: LucideIcon; count?: 'hot' | 'soon' | 'quick' }[] = [
  { id: 'today', label: 'Сегодня', icon: CalendarCheck },
  { id: 'hot', label: 'Горит', icon: Flame, count: 'hot' },
  { id: 'soon', label: 'Скоро', icon: Clock, count: 'soon' },
  { id: 'quick', label: 'Быстрые задачи', icon: Zap, count: 'quick' },
  { id: 'notes', label: 'Заметки', icon: StickyNote },
  { id: 'time', label: 'Время', icon: Timer },
  { id: 'reports', label: 'Отчёты', icon: BarChart3 },
  { id: 'done', label: 'Выполнено', icon: CheckCheck },
]

const BADGE = {
  hot: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  soon: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  quick: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
} as const

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
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:h-dvh lg:py-6">
      <h1 className="px-2 text-xl font-bold tracking-tight">Планер</h1>

      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {ITEMS.map(({ id, label, icon: Icon, count }) => {
          const n = count ? counts[count] : 0
          return (
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
              {count && n > 0 && (
                <span className={`rounded-md px-1.5 text-xs ${BADGE[count]}`}>{n}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="hidden lg:block">
        <p className="mb-1.5 px-2.5 text-xs text-slate-500">Теги</p>
        <div className="flex flex-wrap gap-1.5 px-2">
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
      </div>

      <div className="flex items-center gap-2 px-2 text-xs text-slate-500 lg:mt-auto">
        <span className="min-w-0 flex-1 truncate">{email}</span>
        <button
          onClick={onTheme}
          aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={onSignOut}
          aria-label="Выйти"
          className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
