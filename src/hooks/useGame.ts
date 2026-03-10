import { useState, useCallback, useRef } from 'preact/hooks'
import { storage } from '../lib/storageContext'
import type { TableData } from '../lib/storage'
import { buildDeck, isCorrectAnswer, isCorrectTenFriendsAnswer, computeEndRound } from '../lib/game-logic'
import type { GameCard } from '../lib/game-logic'
import { getCategoryDef, TEN_FRIENDS_CATEGORY_ID } from '../lib/constants'
import type { Operation } from '../lib/constants'
import { opSymbol } from '../lib/hint-utils'

interface GameState {
  table: number
  categoryId: number
  operation: Operation
  equations: Map<number, { a: number; b: number }>
  deck: GameCard[]
  clearPile: number[]
  retryPile: number[]
  current: GameCard | null
  question: string
  answer: number
  backLabel: string
  peeked: boolean
  busy: boolean
}

export interface RoundResult {
  clearCount: number
  retryCount: number
  allClear: boolean
  table: number
  categoryId: number
  wins: number
}

const initialState: GameState = {
  table: 1,
  categoryId: 1,
  operation: 'multiply',
  equations: new Map(),
  deck: [],
  clearPile: [],
  retryPile: [],
  current: null,
  question: '',
  answer: 0,
  backLabel: '',
  peeked: false,
  busy: false,
}

function computeCardDisplay(state: GameState, card: GameCard): { question: string; answer: number; backLabel: string } {
  const a = state.operation === 'multiply' ? state.table : (card.a ?? 0)
  const b = state.operation === 'multiply' ? card.n : (card.b ?? 0)
  const isTenFriends = state.categoryId === TEN_FRIENDS_CATEGORY_ID && state.operation === 'add'
  const sym = opSymbol(state.operation)
  const question = isTenFriends ? `${a} + ?` : `${a} ${sym} ${b}`
  const answer = isTenFriends ? b : state.operation === 'multiply' ? a * b : state.operation === 'add' ? a + b : a - b
  const backLabel = isTenFriends ? `${a} + ${b} = 10` : `${question} = ${answer}`
  return { question, answer, backLabel }
}

function pickRandom(deck: GameCard[]): GameCard {
  return deck[Math.floor(Math.random() * deck.length)]
}

function nextCard(state: GameState): GameState {
  if (state.deck.length === 0) {
    return state
  }
  const current = pickRandom(state.deck)
  const display = computeCardDisplay(state, current)
  return { ...state, current, ...display, peeked: false, busy: false }
}

export function useGame(username: string) {
  const [gameState, setGameState] = useState<GameState>(initialState)
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const gsRef = useRef<GameState>(initialState)
  const savedTdRef = useRef<TableData>({ wins: 0, clear: [], retry: [] })

  // Keep ref in sync for use inside timeouts
  const updateState = useCallback((updater: (prev: GameState) => GameState) => {
    setGameState(prev => {
      const next = updater(prev)
      gsRef.current = next
      return next
    })
  }, [])

  const startGame = useCallback(async (categoryId: number) => {
    setRoundResult(null)

    const catDef = getCategoryDef(categoryId)
    const operation: Operation = catDef?.operation ?? 'multiply'
    // For multiply, table = categoryId; for plus/minus, table = categoryId (used as storage key)
    const table = categoryId

    const userData = await storage.getUser(username)
    const tables = userData?.tables ?? {}
    const td: TableData = tables[table] ?? { wins: 0, clear: [], retry: [] }

    let deck: GameCard[] = buildDeck(td)

    // Build equation map for plus/minus categories
    let equations = new Map<number, { a: number; b: number }>()
    if (operation !== 'multiply' && catDef?.generateEquations) {
      const eqs = catDef.generateEquations()
      eqs.forEach((eq, i) => equations.set(i + 1, eq))
    }

    // If all done, reset
    if (deck.length === 0) {
      deck = Array.from({ length: 10 }, (_, i) => ({ n: i + 1, fromRetry: false }))
      const resetTd: TableData = { wins: td.wins, clear: [], retry: [] }
      await storage.saveTableData(username, table, resetTd)
      // Regenerate equations for the fresh deck
      if (operation !== 'multiply' && catDef?.generateEquations) {
        const eqs = catDef.generateEquations()
        equations = new Map()
        eqs.forEach((eq, i) => equations.set(i + 1, eq))
      }
    }

    // Attach a/b to each card for plus/minus
    if (operation !== 'multiply') {
      deck = deck.map(card => {
        const eq = equations.get(card.n)
        return eq ? { ...card, a: eq.a, b: eq.b } : card
      })
    }

    savedTdRef.current = td

    const current = pickRandom(deck)
    const partialState: GameState = {
      table,
      categoryId,
      operation,
      equations,
      deck,
      clearPile: [],
      retryPile: [],
      current,
      question: '',
      answer: 0,
      backLabel: '',
      peeked: false,
      busy: false,
    }
    const display = computeCardDisplay(partialState, current)
    const newState: GameState = { ...partialState, ...display }
    gsRef.current = newState
    setGameState(newState)
  }, [username])

  const endRound = useCallback((state: GameState) => {
    const { table, clearPile, retryPile, categoryId } = state
    const td = savedTdRef.current

    const { newClear, newRetry, allClear, wins } = computeEndRound(td, clearPile, retryPile)

    setRoundResult({
      clearCount: clearPile.length,
      retryCount: retryPile.length,
      allClear,
      table,
      categoryId,
      wins,
    })

    // Spara i bakgrunden – blockerar inte UI
    const savePromise = allClear
      ? storage.saveCompletedRound(username, table, { wins, clear: [], retry: [] })
      : storage.saveTableData(username, table, { wins, clear: newClear, retry: newRetry })
    savePromise.catch(err => console.error('Failed to save round result:', err))
  }, [username])

  const bgSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backgroundSave = useCallback((clearPile: number[], retryPile: number[]) => {
    if (bgSaveTimerRef.current) clearTimeout(bgSaveTimerRef.current)
    bgSaveTimerRef.current = setTimeout(() => {
      const { newClear, newRetry, wins } = computeEndRound(savedTdRef.current, clearPile, retryPile)
      storage.saveTableData(username, gsRef.current.table, { wins, clear: newClear, retry: newRetry })
        .catch(err => console.error('Background save failed:', err))
    }, 2000)
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
      endRound(updated)
      return
    }

    backgroundSave(newClear, newRetry)
    const withNext = nextCard(updated)
    gsRef.current = withNext
    setGameState(withNext)
  }, [endRound, backgroundSave])

  const submitAnswer = useCallback((value: number): 'correct' | 'wrong' | 'invalid' => {
    const gs = gsRef.current
    if (gs.busy || !gs.current) return 'invalid'
    if (isNaN(value)) return 'invalid'

    const a = gs.operation === 'multiply' ? gs.table : (gs.current.a ?? 0)
    const b = gs.operation === 'multiply' ? gs.current.n : (gs.current.b ?? 0)
    const isTenFriends = gs.categoryId === TEN_FRIENDS_CATEGORY_ID && gs.operation === 'add'
    const isCorrect = isTenFriends
      ? isCorrectTenFriendsAnswer(a, value)
      : isCorrectAnswer(gs.operation, a, b, value)

    if (isCorrect) {
      updateState(prev => ({ ...prev, busy: true }))
      const isLastCard = gs.deck.length === 1
      setTimeout(() => {
        moveCard(true)
      }, isLastCard ? 900 : 1400)
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
    }, 2400)
  }, [moveCard, updateState])

  const moveToRetry = useCallback(() => {
    moveCard(false)
  }, [moveCard])

  /** Save progress mid-round so exiting the game screen doesn't lose answered cards. */
  const saveProgress = useCallback(async () => {
    const gs = gsRef.current
    if (gs.clearPile.length === 0 && gs.retryPile.length === 0) return

    const { newClear, newRetry, wins } = computeEndRound(savedTdRef.current, gs.clearPile, gs.retryPile)
    await storage.saveTableData(username, gs.table, { wins, clear: newClear, retry: newRetry })
  }, [username])

  return {
    gameState,
    roundResult,
    startGame,
    submitAnswer,
    peekCard,
    moveToRetry,
    saveProgress,
  }
}
