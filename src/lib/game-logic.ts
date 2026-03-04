import type { TableData } from './storage'

export interface GameCard {
  n: number
  fromRetry: boolean
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

/** Check whether a submitted answer is correct for a given table and card number. */
export function isCorrectAnswer(table: number, cardNumber: number, value: number): boolean {
  return table * cardNumber === value
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
