import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    createUser: vi.fn(),
    validatePin: vi.fn(),
    getUser: vi.fn(),
    saveTableData: vi.fn(),
    logCompletion: vi.fn(),
    saveCompletedRound: vi.fn(),
  },
}))

vi.mock('../lib/storageContext', () => ({
  storage: mockStorage,
}))

import { createElement } from 'preact'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { useGame } from './useGame'

interface RenderHookResult<T> {
  result: { current: T }
  unmount: () => void
}

async function renderHookCustom<T>(hookFn: () => T): Promise<RenderHookResult<T>> {
  const result: { current: T } = { current: undefined as unknown as T }

  function TestComponent() {
    result.current = hookFn()
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)

  await act(() => {
    render(createElement(TestComponent, null), container)
  })

  return {
    result,
    unmount: () => {
      render(null, container)
      document.body.removeChild(container)
    },
  }
}

describe('useGame', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockStorage.getUser.mockResolvedValue({ tables: {}, completionLog: [] })
    mockStorage.saveTableData.mockResolvedValue(undefined)
    mockStorage.logCompletion.mockResolvedValue(undefined)
    mockStorage.saveCompletedRound.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('startGame', () => {
    it('initializes a multiply game with 10 cards', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3) // table 3
      })

      expect(result.current.gameState.table).toBe(3)
      expect(result.current.gameState.deck).toHaveLength(10)
      expect(result.current.gameState.current).not.toBeNull()
      expect(result.current.gameState.clearPile).toEqual([])
      expect(result.current.gameState.retryPile).toEqual([])
      expect(result.current.roundResult).toBeNull()
      unmount()
    })

    it('initializes a plus category game with equations', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(12) // Tiokompisar
      })

      expect(result.current.gameState.operation).toBe('add')
      expect(result.current.gameState.categoryId).toBe(12)
      expect(result.current.gameState.current).not.toBeNull()
      unmount()
    })

    it('loads existing progress from storage', async () => {
      mockStorage.getUser.mockResolvedValue({
        tables: { 3: { wins: 2, clear: [1, 2, 3], retry: [4] } },
      })

      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      // 10 total - 3 cleared = 7 cards in deck (current is one of them)
      expect(result.current.gameState.deck).toHaveLength(7)
      unmount()
    })

    it('resets when all cards are cleared', async () => {
      const allCleared = Array.from({ length: 10 }, (_, i) => i + 1)
      mockStorage.getUser.mockResolvedValue({
        tables: { 3: { wins: 5, clear: allCleared, retry: [] } },
      })

      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      // Should reset to 10 cards
      expect(result.current.gameState.deck).toHaveLength(10)
      expect(mockStorage.saveTableData).toHaveBeenCalledWith('testuser', 3, {
        wins: 5,
        clear: [],
        retry: [],
      })
      unmount()
    })
  })

  describe('submitAnswer', () => {
    it('returns correct and sets busy for a correct multiply answer', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      const card = result.current.gameState.current!
      const correctAnswer = 3 * card.n

      let outcome: string
      await act(() => {
        outcome = result.current.submitAnswer(correctAnswer)
      })

      expect(outcome!).toBe('correct')
      expect(result.current.gameState.busy).toBe(true)
      unmount()
    })

    it('returns wrong for an incorrect answer', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      let outcome: string
      await act(() => {
        outcome = result.current.submitAnswer(999)
      })

      expect(outcome!).toBe('wrong')
      expect(result.current.gameState.busy).toBe(false)
      unmount()
    })

    it('returns invalid for NaN', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      let outcome: string
      await act(() => {
        outcome = result.current.submitAnswer(NaN)
      })

      expect(outcome!).toBe('invalid')
      unmount()
    })

    it('returns invalid when busy', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      const card = result.current.gameState.current!
      const correctAnswer = 3 * card.n

      // First correct answer puts us in busy state
      await act(() => { result.current.submitAnswer(correctAnswer) })
      expect(result.current.gameState.busy).toBe(true)

      // Second submit while busy returns invalid
      let outcome: string
      await act(() => {
        outcome = result.current.submitAnswer(correctAnswer)
      })
      expect(outcome!).toBe('invalid')
      unmount()
    })

    it('moves card to clearPile after correct answer timeout', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      const card = result.current.gameState.current!
      const correctAnswer = 3 * card.n

      await act(() => { result.current.submitAnswer(correctAnswer) })

      // Advance timer past the 1400ms delay
      await act(() => { vi.advanceTimersByTime(1500) })

      expect(result.current.gameState.clearPile).toContain(card.n)
      expect(result.current.gameState.busy).toBe(false)
      unmount()
    })
  })

  describe('peekCard', () => {
    it('sets peeked true and busy true', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      await act(() => { result.current.peekCard(false) })

      expect(result.current.gameState.peeked).toBe(true)
      expect(result.current.gameState.busy).toBe(true)
      unmount()
    })

    it('moves card to retryPile after peek timeout', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      const card = result.current.gameState.current!

      await act(() => { result.current.peekCard(false) })
      await act(() => { vi.advanceTimersByTime(2500) })

      expect(result.current.gameState.retryPile).toContain(card.n)
      unmount()
    })

    it('does nothing when busy', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      // Make busy via correct answer
      const card = result.current.gameState.current!
      await act(() => { result.current.submitAnswer(3 * card.n) })
      expect(result.current.gameState.busy).toBe(true)
      expect(result.current.gameState.peeked).toBe(false)

      // peek should be ignored while busy — peeked stays false
      await act(() => { result.current.peekCard(false) })
      expect(result.current.gameState.peeked).toBe(false)
      unmount()
    })
  })

  describe('moveToRetry', () => {
    it('moves current card to retry pile', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      const card = result.current.gameState.current!

      await act(() => { result.current.moveToRetry() })

      expect(result.current.gameState.retryPile).toContain(card.n)
      unmount()
    })
  })

  describe('round completion', () => {
    it('calls endRound and sets roundResult when deck is exhausted', async () => {
      // Set up so only 1 card remains (9 cleared)
      mockStorage.getUser.mockResolvedValue({
        tables: { 3: { wins: 0, clear: [1, 2, 3, 4, 5, 6, 7, 8, 9], retry: [] } },
      })

      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      // Only card 10 should remain
      expect(result.current.gameState.deck).toHaveLength(1)

      const card = result.current.gameState.current!
      const correctAnswer = 3 * card.n

      await act(() => { result.current.submitAnswer(correctAnswer) })

      // Advance past the moveCard timeout (900ms for last card)
      await act(() => { vi.advanceTimersByTime(1000) })

      // roundResult should be set synchronously after endRound
      expect(result.current.roundResult).not.toBeNull()
      expect(result.current.roundResult!.allClear).toBe(true)
      expect(result.current.roundResult!.wins).toBe(1)
      unmount()
    })

    it('persists data via storage on round end', async () => {
      mockStorage.getUser.mockResolvedValue({
        tables: { 3: { wins: 0, clear: [1, 2, 3, 4, 5, 6, 7, 8, 9], retry: [] } },
      })

      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      const card = result.current.gameState.current!
      await act(() => { result.current.submitAnswer(3 * card.n) })

      // Advance past the moveCard timeout (900ms for last card)
      await act(() => { vi.advanceTimersByTime(1000) })

      // Should have saved completed round (combined save + log in single write)
      expect(mockStorage.saveCompletedRound).toHaveBeenCalledWith('testuser', 3, expect.objectContaining({ wins: 1, clear: [], retry: [] }))
      unmount()
    })
  })

  describe('saveProgress', () => {
    it('does nothing when no cards have been answered', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      mockStorage.saveTableData.mockClear()

      await act(async () => {
        await result.current.saveProgress()
      })

      expect(mockStorage.saveTableData).not.toHaveBeenCalled()
      unmount()
    })

    it('persists progress when cards have been answered', async () => {
      const { result, unmount } = await renderHookCustom(() => useGame('testuser'))

      await act(async () => {
        await result.current.startGame(3)
      })

      // Answer one card correctly
      const card = result.current.gameState.current!
      await act(() => { result.current.submitAnswer(3 * card.n) })
      await act(() => { vi.advanceTimersByTime(1500) })

      mockStorage.saveTableData.mockClear()
      mockStorage.getUser.mockResolvedValue({
        tables: { 3: { wins: 0, clear: [], retry: [] } },
      })

      await act(async () => {
        await result.current.saveProgress()
      })

      expect(mockStorage.saveTableData).toHaveBeenCalled()
      unmount()
    })
  })
})
