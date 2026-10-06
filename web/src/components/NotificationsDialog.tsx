import { useEffect, useState } from 'react'
import {
  disablePush,
  enablePush,
  getPushState,
  loadReminderSettings,
  saveReminderSettings,
  showTestNotification,
  type PushState,
} from '../push'

interface Props {
  onClose: () => void
}

const OFFSETS = [
  { value: 1440, label: 'За 1 день' },
  { value: 60, label: 'За 1 час' },
  { value: 15, label: 'За 15 минут' },
  { value: 0, label: 'В момент дедлайна' },
]

export default function NotificationsDialog({ onClose }: Props) {
  const [state, setState] = useState<PushState | null>(null)
  const [offsets, setOffsets] = useState<number[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getPushState().then((s) => active && setState(s))
    void loadReminderSettings()
      .then((s) => active && setOffsets(s.remindBeforeMin))
      .catch(() => active && setOffsets([60]))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function toggleDevice() {
    setBusy(true)
    setMessage(null)
    try {
      if (state === 'on') await disablePush()
      else await enablePush()
      setState(await getPushState())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не получилось')
      setState(await getPushState())
    }
    setBusy(false)
  }

  async function toggleOffset(value: number) {
    if (!offsets) return
    const next = offsets.includes(value) ? offsets.filter((o) => o !== value) : [...offsets, value]
    setOffsets(next)
    try {
      await saveReminderSettings(next.sort((a, b) => b - a))
      setMessage(null)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось сохранить')
    }
  }

  async function test() {
    setMessage(null)
    try {
      await showTestNotification()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось показать уведомление')
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Уведомления</h2>

        <section>
          <p className="mb-1.5 text-xs text-slate-500">Это устройство</p>
          {state === null && <p className="text-sm text-slate-400">Проверяю…</p>}
          {state === 'unsupported' && (
            <p className="text-sm text-slate-500">
              Этот браузер не поддерживает уведомления. Попробуйте Chrome или Safari на iPhone (после установки
              на экран «Домой»).
            </p>
          )}
          {state === 'needs-install' && (
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <p>На iPhone уведомления работают только в установленном приложении:</p>
              <ol className="list-decimal space-y-0.5 pl-5 text-slate-500">
                <li>Откройте этот сайт в Safari.</li>
                <li>Нажмите «Поделиться» (квадрат со стрелкой).</li>
                <li>Выберите «На экран “Домой”» и добавьте.</li>
                <li>Откройте Planner с новой иконки и вернитесь сюда.</li>
              </ol>
            </div>
          )}
          {state === 'denied' && (
            <p className="text-sm text-slate-500">
              Уведомления запрещены. Разрешите их для этого сайта в настройках браузера (значок замка рядом с
              адресом) или в настройках iPhone, затем обновите страницу.
            </p>
          )}
          {(state === 'off' || state === 'on') && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => void toggleDevice()}
                disabled={busy}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                  state === 'on'
                    ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {state === 'on' ? 'Выключить на этом устройстве' : 'Включить на этом устройстве'}
              </button>
              {state === 'on' && (
                <button
                  onClick={() => void test()}
                  className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Проверить
                </button>
              )}
              {state === 'on' && <span className="text-xs text-emerald-600">включены</span>}
            </div>
          )}
        </section>

        <section>
          <p className="mb-1.5 text-xs text-slate-500">Когда напоминать о задаче с дедлайном</p>
          <div className="space-y-1.5">
            {OFFSETS.map((o) => (
              <label key={o.value} className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  disabled={offsets === null}
                  checked={offsets?.includes(o.value) ?? false}
                  onChange={() => void toggleOffset(o.value)}
                  className="size-4 accent-indigo-600"
                />
                {o.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Напоминания приходят только по задачам с дедлайном и на все устройства, где они включены.
          </p>
        </section>

        {message && <p className="text-sm text-red-500">{message}</p>}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
