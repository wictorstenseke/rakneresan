import { useState, useCallback, useRef } from 'preact/hooks'
import { storage } from '../lib/storageContext'
import type { TableData } from '../lib/storage'

interface GameCard {
  n: number
  fromRetry: boolean
}

interface GameState {
  table: number
  deck: GameCard[]
  clearPile: number[]
  retryPile: number[]
  current: GameCard | null
  peeked: boolean
  busy: boolean
}

export interface RoundResult {
  clearCount: number
  retryCount: number
  allClear: boolean
  table: number
  wins: number
}

const initialState: GameState = {
  table: 1,
  deck: [],
  clearPile: [],
  retryPile: [],
  current: null,
  peeked: false,
  busy: false,
}

function pickRandom(deck: GameCard[]): GameCard {
  return deck[Math.floor(Math.random() * deck.length)]
}

function nextCard(state: GameState): GameState {
  if (state.deck.length === 0) {
    return state
  }
  const current = pickRandom(state.deck)
  return { ...state, current, peeked: false, busy: false }
}

export function useGame(username: string) {
  const [gameState, setGameState] = useState<GameState>(initialState)
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const gsRef = useRef<GameState>(initialState)

  // Keep ref in sync for use inside timeouts
  const updateState = useCallback((updater: (prev: GameState) => GameState) => {
    setGameState(prev => {
      const next = updater(prev)
      gsRef.current = next
      return next
    })
  }, [])

  const startGame = useCallback(async (table: number) => {
    setRoundResult(null)

    const userData = await storage.getUser(username)
    const tables = userData?.tables ?? {}
    const td: TableData = tables[table] ?? { wins: 0, clear: [], retry: [] }

    const all = Array.from({ length: 10 }, (_, i) => i + 1)

    let deck: GameCard[] = [
      ...td.retry.map(n => ({ n, fromRetry: true })),
      ...all
        .filter(n => !td.clear.includes(n) && !td.retry.includes(n))
        .map(n => ({ n, fromRetry: false })),
    ]

    // If all done, reset
    if (deck.length === 0) {
      deck = all.map(n => ({ n, fromRetry: false }))
      const resetTd: TableData = { wins: td.wins, clear: [], retry: [] }
      await storage.saveTableData(username, table, resetTd)
    }

    const current = pickRandom(deck)
    const newState: GameState = {
      table,
      deck,
      clearPile: [],
      retryPile: [],
      current,
      peeked: false,
      busy: false,
    }
    gsRef.current = newState
    setGameState(newState)
  }, [username])

  const endRound = useCallback(async (state: GameState) => {
    const { table, clearPile, retryPile } = state

    const userData = await storage.getUser(username)
    const tables = userData?.tables ?? {}
    const td: TableData = tables[table] ?? { wins: 0, clear: [], retry: [] }

    const newClear = [...new Set([...(td.clear || []), ...clearPile])]
    let newRetry = retryPile.filter(n => !newClear.includes(n))
    const allClear = newClear.length === 10
    let wins = td.wins || 0

    if (allClear) {
      wins += 1
      await storage.saveTableData(username, table, { wins, clear: [], retry: [] })
    } else {
      await storage.saveTableData(username, table, { wins, clear: newClear, retry: newRetry })
    }

    if (allClear) {
      newRetry = []
    }

    setRoundResult({
      clearCount: clearPile.length,
      retryCount: retryPile.length,
      allClear,
      table,
      wins,
    })
  }, [username])

  const moveCard = useCallback((correct: boolean): void => {
    const gs = gsRef.current
    if (!gs.current) return

    const idx = gs.deck.indexOf(gs.current)
    const newDeck = [...gs.deck]
    if (idx > -1) newDeck.splice(idx, 1)

    const newClear = [...gs.clearPile]
    const newRetry = [...gs.retryPile]

    if (correct && !gs.peeked) {
      newClear.push(gs.current.n)
    } else {
      newRetry.push(gs.current.n)
    }

    const updated: GameState = {
      ...gs,
      deck: newDeck,
      clearPile: newClear,
      retryPile: newRetry,
    }

    if (newDeck.length === 0) {
      gsRef.current = updated
      setGameState(updated)
      void endRound(updated)
      return
    }

    const withNext = nextCard(updated)
    gsRef.current = withNext
    setGameState(withNext)
  }, [endRound])

  const submitAnswer = useCallback((value: number): 'correct' | 'wrong' | 'invalid' => {
    const gs = gsRef.current
    if (gs.busy || !gs.current) return 'invalid'
    if (isNaN(value)) return 'invalid'

    const correct = gs.table * gs.current.n
    if (value === correct) {
      updateState(prev => ({ ...prev, busy: true }))
      setTimeout(() => {
        moveCard(true)
      }, 900)
      return 'correct'
    } else {
      return 'wrong'
    }
  }, [moveCard, updateState])

  const peekCard = useCallback(() => {
    const gs = gsRef.current
    if (gs.busy) return
    updateState(prev => ({ ...prev, peeked: true, busy: true }))
    setTimeout(() => {
      moveCard(false)
    }, 1800)
  }, [moveCard, updateState])

  const continueGame = useCallback(() => {
    void startGame(gsRef.current.table)
  }, [startGame])

  return {
    gameState,
    roundResult,
    startGame,
    submitAnswer,
    peekCard,
    continueGame,
  }
}
