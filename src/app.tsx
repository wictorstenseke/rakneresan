import { useState, useCallback, useEffect } from 'preact/hooks'
import { lazy, Suspense } from 'preact/compat'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import type { RoundResult } from './hooks/useGame'

const GamePage = lazy(() => import('./pages/GamePage'))
const CompletePage = lazy(() => import('./pages/CompletePage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))

type Screen = 'login' | 'home' | 'game' | 'complete' | 'stats'

function ScreenFallback() {
  return (
    <div class="screen active auth-loading">
      <div class="font-[Nunito] text-[1.1rem] text-[var(--text-muted)]">Laddar...</div>
    </div>
  )
}

export function App() {
  const { currentUser, authReady, login, logout } = useAuth()
  const [screen, setScreen] = useState<Screen>('login')
  const [selectedTable, setSelectedTable] = useState(1)  // stores categoryId

  useEffect(() => {
    if (authReady && currentUser && screen === 'login') {
      setScreen('home')
    }
  }, [authReady, currentUser, screen])

  const effectiveScreen: Screen = authReady && currentUser && screen === 'login' ? 'home' : screen
  const [gameKey, setGameKey] = useState(0)
  const [completeResult, setCompleteResult] = useState<RoundResult | null>(null)

  const handleLogin = useCallback(() => {
    setScreen('home')
  }, [])

  const handleLogout = useCallback(() => {
    void logout()
    setScreen('login')
  }, [logout])

  const handleSelectTable = useCallback((table: number) => {
    setSelectedTable(table)
    setGameKey(k => k + 1)
    setScreen('game')
  }, [])

  const handleGameComplete = useCallback((result: RoundResult) => {
    setCompleteResult(result)
    setScreen('complete')
  }, [])

  const goHome = useCallback(() => {
    setScreen('home')
  }, [])

  const handleContinue = useCallback(() => {
    setGameKey(k => k + 1)
    setScreen('game')
  }, [])

  const handleStats = useCallback(() => {
    setScreen('stats')
  }, [])

  if (!authReady) {
    return <ScreenFallback />
  }

  switch (effectiveScreen) {
    case 'login':
      return <LoginPage login={login} onLogin={handleLogin} />
    case 'home':
      return (
        <HomePage
          user={currentUser!}
          onSelectTable={handleSelectTable}
          onLogout={handleLogout}
          onStats={handleStats}
        />
      )
    case 'game':
      return (
        <Suspense fallback={<ScreenFallback />}>
          <GamePage
            key={gameKey}
            categoryId={selectedTable}
            user={currentUser!}
            onBack={goHome}
            onComplete={handleGameComplete}
          />
        </Suspense>
      )
    case 'complete':
      return completeResult ? (
        <Suspense fallback={<ScreenFallback />}>
          <CompletePage
            result={completeResult}
            onContinue={handleContinue}
            onBack={goHome}
          />
        </Suspense>
      ) : null
    case 'stats':
      return (
        <Suspense fallback={<ScreenFallback />}>
          <StatsPage
            user={currentUser!}
            onBack={goHome}
          />
        </Suspense>
      )
    default:
      return null
  }
}
