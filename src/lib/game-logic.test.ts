import { describe, it, expect } from 'vitest'
import { buildDeck, isCorrectAnswer, isCorrectTenFriendsAnswer, computeEndRound } from './game-logic'

describe('buildDeck', () => {
  it('returns 10 cards when no prior progress', () => {
    const deck = buildDeck({ wins: 0, clear: [], retry: [] })
    expect(deck).toHaveLength(10)
    expect(deck.every(c => !c.fromRetry)).toBe(true)
  })

  it('puts retry cards first', () => {
    const deck = buildDeck({ wins: 0, clear: [], retry: [3, 7] })
    expect(deck[0].fromRetry).toBe(true)
    expect(deck[1].fromRetry).toBe(true)
    const retryNums = deck.filter(c => c.fromRetry).map(c => c.n)
    expect(retryNums).toContain(3)
    expect(retryNums).toContain(7)
  })

  it('excludes cleared cards', () => {
    const deck = buildDeck({ wins: 0, clear: [1, 2, 3, 4, 5], retry: [] })
    expect(deck).toHaveLength(5)
    expect(deck.some(c => [1, 2, 3, 4, 5].includes(c.n))).toBe(false)
  })

  it('excludes retry cards from the uncleared pool', () => {
    const deck = buildDeck({ wins: 0, clear: [], retry: [3] })
    // card 3 should appear exactly once (as retry), not twice
    expect(deck.filter(c => c.n === 3)).toHaveLength(1)
    expect(deck).toHaveLength(10)
  })

  it('returns empty deck when all 10 are cleared', () => {
    const all = Array.from({ length: 10 }, (_, i) => i + 1)
    const deck = buildDeck({ wins: 0, clear: all, retry: [] })
    expect(deck).toHaveLength(0)
  })
})

describe('isCorrectAnswer', () => {
  it('returns true for the correct product (multiply)', () => {
    expect(isCorrectAnswer('multiply', 3, 7, 21)).toBe(true)
    expect(isCorrectAnswer('multiply', 5, 5, 25)).toBe(true)
    expect(isCorrectAnswer('multiply', 10, 10, 100)).toBe(true)
    expect(isCorrectAnswer('multiply', 1, 1, 1)).toBe(true)
  })

  it('returns false for an incorrect answer (multiply)', () => {
    expect(isCorrectAnswer('multiply', 3, 7, 22)).toBe(false)
    expect(isCorrectAnswer('multiply', 5, 5, 24)).toBe(false)
    expect(isCorrectAnswer('multiply', 10, 10, 99)).toBe(false)
  })

  it('returns true for correct addition', () => {
    expect(isCorrectAnswer('add', 3, 7, 10)).toBe(true)
    expect(isCorrectAnswer('add', 5, 5, 10)).toBe(true)
    expect(isCorrectAnswer('add', 100, 200, 300)).toBe(true)
  })

  it('returns false for incorrect addition', () => {
    expect(isCorrectAnswer('add', 3, 7, 11)).toBe(false)
  })

  it('returns true for correct subtraction', () => {
    expect(isCorrectAnswer('subtract', 10, 3, 7)).toBe(true)
    expect(isCorrectAnswer('subtract', 20, 9, 11)).toBe(true)
  })

  it('returns false for incorrect subtraction', () => {
    expect(isCorrectAnswer('subtract', 10, 3, 8)).toBe(false)
  })
})

describe('isCorrectTenFriendsAnswer', () => {
  it('accepts the missing addend for ten-friends equations', () => {
    expect(isCorrectTenFriendsAnswer(6, 4)).toBe(true)
    expect(isCorrectTenFriendsAnswer(8, 2)).toBe(true)
    expect(isCorrectTenFriendsAnswer(3, 7)).toBe(true)
  })

  it('rejects answering 10 unless 10 is the missing addend', () => {
    expect(isCorrectTenFriendsAnswer(6, 10)).toBe(false)
    expect(isCorrectTenFriendsAnswer(0, 10)).toBe(true)
  })

  it('keeps normal addition behavior unchanged', () => {
    expect(isCorrectAnswer('add', 6, 4, 10)).toBe(true)
    expect(isCorrectAnswer('add', 6, 4, 4)).toBe(false)
  })
})

describe('computeEndRound', () => {
  it('merges new clear cards with existing ones', () => {
    const result = computeEndRound(
      { wins: 0, clear: [1, 2, 3], retry: [] },
      [4, 5],
      [],
    )
    expect(result.newClear).toHaveLength(5)
    expect(result.newClear).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]))
  })

  it('deduplicates clear cards', () => {
    const result = computeEndRound(
      { wins: 0, clear: [1, 2], retry: [] },
      [2, 3],
      [],
    )
    expect(result.newClear.filter(n => n === 2)).toHaveLength(1)
  })

  it('removes retry cards that are now in clear', () => {
    const result = computeEndRound(
      { wins: 0, clear: [1], retry: [] },
      [3],
      [3, 4],
    )
    expect(result.newClear).toContain(3)
    expect(result.newRetry).not.toContain(3)
    expect(result.newRetry).toContain(4)
  })

  it('sets allClear true when 10 distinct cards are cleared', () => {
    const first9 = Array.from({ length: 9 }, (_, i) => i + 1)
    const result = computeEndRound(
      { wins: 0, clear: first9, retry: [] },
      [10],
      [],
    )
    expect(result.allClear).toBe(true)
  })

  it('sets allClear false when fewer than 10 cleared', () => {
    const result = computeEndRound(
      { wins: 0, clear: [], retry: [] },
      [1, 2, 3],
      [],
    )
    expect(result.allClear).toBe(false)
  })

  it('increments wins by 1 on allClear', () => {
    const first9 = Array.from({ length: 9 }, (_, i) => i + 1)
    const result = computeEndRound(
      { wins: 2, clear: first9, retry: [] },
      [10],
      [],
    )
    expect(result.wins).toBe(3)
  })

  it('does not change wins when not allClear', () => {
    const result = computeEndRound(
      { wins: 2, clear: [], retry: [] },
      [1, 2],
      [],
    )
    expect(result.wins).toBe(2)
  })
})
