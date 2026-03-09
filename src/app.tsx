import { useState, useCallback, useEffect } from 'preact/hooks'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { GamePage } from './pages/GamePage'
import { CompletePage } from './pages/CompletePage'
import { StatsPage } from './pages/StatsPage'
import type { RoundResult } from './hooks/useGame'

type Screen = 'login' | 'home' | 'game' | 'complete' | 'stats'

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
    logout()
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

  const handleGameBack = useCallback(() => {
    setScreen('home')
  }, [])

  const handleContinue = useCallback(() => {
    setGameKey(k => k + 1)
    setScreen('game')
  }, [])

  const handleCompleteBack = useCallback(() => {
    setScreen('home')
  }, [])

  const handleStats = useCallback(() => {
    setScreen('stats')
  }, [])

  const handleStatsBack = useCallback(() => {
    setScreen('home')
  }, [])

  if (!authReady) {
    return (
      <div class="screen active auth-loading">
        <div class="auth-loading-text">Laddar...</div>
      </div>
    )
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
        <GamePage
          key={gameKey}
          categoryId={selectedTable}
          user={currentUser!}
          onBack={handleGameBack}
          onComplete={handleGameComplete}
        />
      )
    case 'complete':
      return completeResult ? (
        <CompletePage
          result={completeResult}
          onContinue={handleContinue}
          onBack={handleCompleteBack}
        />
      ) : null
    case 'stats':
      return (
        <StatsPage
          user={currentUser!}
          onBack={handleStatsBack}
        />
      )
    default:
      return null
  }
}
