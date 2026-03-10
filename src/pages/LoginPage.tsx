import { useState, useRef } from 'preact/hooks'
import type { JSX } from 'preact'
import { ThemeToggle } from '../components/ThemeToggle'
import { getSavedUsers, removeUser, getUserColor, getUserEmoji } from '../lib/savedUsers'

interface LoginPageProps {
  onLogin: () => void
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>
}

export function LoginPage({ onLogin, login }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [savedUsers, setSavedUsers] = useState(getSavedUsers)
  const [tab, setTab] = useState<'users' | 'form'>(savedUsers.length > 0 ? 'users' : 'form')
  const codeRef = useRef<HTMLInputElement>(null)

  const doLogin = async (u: string, p: string) => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const result = await login(u, p)
      if (result.success) {
        setError('')
        onLogin()
      } else {
        setError(result.error ?? 'Okänt fel')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault()
    void doLogin(username, pin)
  }

  const handleChipLogin = (savedUsername: string, savedPin: string) => {
    void doLogin(savedUsername, savedPin)
  }

  const handleRemove = (e: MouseEvent, savedUsername: string) => {
    e.stopPropagation()
    removeUser(savedUsername)
    const remaining = getSavedUsers()
    setSavedUsers(remaining)
    if (remaining.length === 0) setTab('form')
  }

  const hasSavedUsers = savedUsers.length > 0

  return (
    <div class="screen active login-screen">
      <div class="mb-3 flex justify-end w-full max-w-[400px] px-2">
        <ThemeToggle />
      </div>
      <div class="login-box">
        <img src={`${import.meta.env.BASE_URL}rocket.svg`} alt="" class="login-emoji" width="80" height="80" />
        <h1>Räkneresan</h1>
        <p>Öva gångertabellen – snabbt &amp; kul! 🎉</p>

        {hasSavedUsers && (
          <div class="login-tabs">
            <button
              type="button"
              class={`login-tab${tab === 'users' ? ' active' : ''}`}
              onClick={() => { setTab('users'); setError('') }}
            >
              Välj spelare
            </button>
            <button
              type="button"
              class={`login-tab${tab === 'form' ? ' active' : ''}`}
              onClick={() => { setTab('form'); setError('') }}
            >
              Logga in / Ny
            </button>
          </div>
        )}

        {tab === 'users' && hasSavedUsers && (
          <div class="flex flex-wrap justify-center gap-2 mb-4">
            {savedUsers.map((u) => {
              const color = getUserColor(u.username)
              const emoji = getUserEmoji(u.username)
              return (
                <div
                  key={u.username}
                  class="avatar-chip"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleChipLogin(u.username, u.pin)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleChipLogin(u.username, u.pin) }}
                  aria-disabled={isLoading}
                >
                  <div class="avatar-circle" style={{ backgroundColor: color }}>
                    {emoji}
                  </div>
                  <span class="avatar-name">{u.username}</span>
                  <button
                    type="button"
                    class="avatar-remove"
                    onClick={(e) => handleRemove(e as unknown as MouseEvent, u.username)}
                  >
                    ❌ TA BORT
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'form' && (
          <form onSubmit={handleSubmit}>
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

            <button type="submit" class="btn-primary" disabled={isLoading}>
              {isLoading ? 'Laddar...' : 'Starta! 🚀'}
            </button>
          </form>
        )}

        <div class="login-error">{error}</div>
      </div>
    </div>
  )
}
