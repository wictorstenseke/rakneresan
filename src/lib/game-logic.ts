import type { TableData } from './storage'
import type { Operation } from './constants'

export interface GameCard {
  n: number
  fromRetry: boolean
  a?: number
  b?: number
}

/** Build the initial deck for a round from saved table data. */
export function buildDeck(td: TableData): GameCard[] {
  const all = Array.from({ length: 10 }, (_, i) => i + 1)
  return [
    ...td.retry.map(n => ({ n, fromRetry: true })),
    ...all
      .filter(n => !td.clear.includes(n) && !td.retry.includes(n))
      .map(n => ({ n, fromRetry: false })),
  ]
}

/** Check whether a submitted answer is correct for a given operation and operands. */
export function isCorrectAnswer(operation: Operation, a: number, b: number, value: number): boolean {
  if (operation === 'multiply') return a * b === value
  if (operation === 'add') return a + b === value
  return a - b === value
}

/** For Ten-Friends (a + x = 10), the correct input is the missing addend x. */
export function isCorrectTenFriendsAnswer(a: number, value: number): boolean {
  return 10 - a === value
}

export interface EndRoundUpdate {
  newClear: number[]
  newRetry: number[]
  allClear: boolean
  wins: number
}

/** Compute the new table state after a round ends. */
export function computeEndRound(
  td: TableData,
  clearPile: number[],
  retryPile: number[],
): EndRoundUpdate {
  const newClear = [...new Set([...(td.clear || []), ...clearPile])]
  const newRetry = retryPile.filter(n => !newClear.includes(n))
  const allClear = newClear.length === 10
  const wins = allClear ? (td.wins || 0) + 1 : (td.wins || 0)
  return { newClear, newRetry, allClear, wins }
}
