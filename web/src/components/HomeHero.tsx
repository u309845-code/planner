import { greetingFor, messageForDay } from '../dailyMessages'
import { useNow } from '../hooks'

interface Props {
  /** Сколько задач на сегодня, сделано, горит */
  total: number
  done: number
  hot: number
}

/** Верх главной страницы: приветствие, дата и время, послание дня, итог по задачам. */
export default function HomeHero({ total, done, hot }: Props) {
  const now = useNow(10_000)
  const d = new Date(now)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const date = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  const summary =
    total === 0
      ? 'На сегодня задач нет'
      : done === total
        ? `Все ${total} на сегодня сделаны`
        : `На сегодня ${total}, сделано ${done}`

  return (
    <section className="mb-5 rounded-2xl bg-indigo-50 p-5 dark:bg-indigo-950/30">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className="text-sm text-indigo-700 dark:text-indigo-300">{greetingFor(now)}</p>
          <p className="text-4xl font-semibold tabular-nums tracking-tight">{time}</p>
        </div>
        <p className="pb-1 text-base capitalize text-slate-600 dark:text-slate-300">{date}</p>
      </div>
      <p className="mt-4 text-lg leading-snug text-slate-800 dark:text-slate-100">
        {messageForDay(now)}
      </p>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        {summary}
        {hot > 0 && <span className="text-red-600 dark:text-red-400"> · горит: {hot}</span>}
      </p>
    </section>
  )
}
