import { useState, type FormEvent } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else if (!data.session) setMessage('Мы отправили письмо — подтвердите почту и войдите.')
    }
    setBusy(false)
  }

  const input =
    'w-full rounded-lg bg-slate-100 px-3 py-2.5 text-base outline-none dark:bg-slate-800'

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Планер</h1>
      <p className="mb-6 text-sm text-slate-500">
        {mode === 'in' ? 'Войдите, чтобы увидеть свои задачи' : 'Создайте аккаунт'}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={input}
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль (не короче 6 символов)"
          className={input}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {mode === 'in' ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-red-500">{message}</p>}
      <button
        onClick={() => {
          setMode(mode === 'in' ? 'up' : 'in')
          setMessage(null)
        }}
        className="mt-5 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {mode === 'in' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
      </button>
    </div>
  )
}
