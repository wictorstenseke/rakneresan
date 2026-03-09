import type { Operation } from './constants'

export function getMultiplyHints(table: number): number[] {
  const hints = Array.from({ length: 10 }, (_, i) => (i + 1) * table)
  for (let i = hints.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[hints[i], hints[j]] = [hints[j], hints[i]]
  }
  return hints
}

export function opSymbol(operation: Operation): string {
  if (operation === 'add') return '+'
  if (operation === 'subtract') return '−'
  return '×'
}
