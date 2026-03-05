import { useState, useRef } from 'preact/hooks'
import type { JSX } from 'preact'

interface LoginPageProps {
  onLogin: () => void
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>
}

export function LoginPage({ onLogin, login }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault()
    const result = await login(username, pin)
    if (result.success) {
      setError('')
      onLogin()
    } else {
      setError(result.error ?? 'Okänt fel')
    }
  }

  return (
    <div class="screen active login-screen">
      <form class="login-box" onSubmit={handleSubmit}>
        <img src={`${import.meta.env.BASE_URL}rocket.svg`} alt="" class="login-emoji" width="80" height="80" />
        <h1>Räkneresan</h1>
        <p>Öva gångertabellen – snabbt &amp; kul! 🎉</p>

        <div class="input-group">
          <label>Användarnamn</label>
          <input
            type="text"
            value={username}
            onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
            placeholder="t.ex. kalle"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                codeRef.current?.focus()
              }
            }}
          />
        </div>

        <div class="input-group">
          <label>Hemlig kod (4 siffror)</label>
          <input
            ref={codeRef}
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onInput={(e) => setPin((e.target as HTMLInputElement).value)}
            placeholder="••••"
          />
        </div>

        <button type="submit" class="btn-primary">Starta! 🚀</button>
        <div class="login-error">{error}</div>
      </form>
    </div>
  )
}
