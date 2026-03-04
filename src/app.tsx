import { useState, useCallback } from 'preact/hooks'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { GamePage } from './pages/GamePage'
import { CompletePage } from './pages/CompletePage'
import type { RoundResult } from './hooks/useGame'

type Screen = 'login' | 'home' | 'game' | 'complete'

export function App() {
  const { currentUser, login, logout } = useAuth()
  const [screen, setScreen] = useState<Screen>('login')
  const [selectedTable, setSelectedTable] = useState(1)
  const [completeResult, setCompleteResult] = useState<RoundResult | null>(null)

  const handleLogin = useCallback((_username: string) => {
    setScreen('home')
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    setScreen('login')
  }, [logout])

  const handleSelectTable = useCallback((table: number) => {
    setSelectedTable(table)
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
    setScreen('game')
  }, [])

  const handleCompleteBack = useCallback(() => {
    setScreen('home')
  }, [])

  switch (screen) {
    case 'login':
      return <LoginPage login={login} onLogin={handleLogin} />
    case 'home':
      return (
        <HomePage
          user={currentUser!}
          onSelectTable={handleSelectTable}
          onLogout={handleLogout}
        />
      )
    case 'game':
      return (
        <GamePage
          key={`${selectedTable}-${Date.now()}`}
          table={selectedTable}
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
    default:
      return null
  }
}
