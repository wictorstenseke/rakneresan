import { describe, it, expect } from 'vitest'
import { getMultiplyHints, opSymbol } from './hint-utils'

describe('opSymbol', () => {
  it("returns '+' for add", () => {
    expect(opSymbol('add')).toBe('+')
  })

  it("returns '−' for subtract", () => {
    expect(opSymbol('subtract')).toBe('−')
  })

  it("returns '×' for multiply", () => {
    expect(opSymbol('multiply')).toBe('×')
  })
})

describe('getMultiplyHints', () => {
  it('returns array of length 10', () => {
    expect(getMultiplyHints(3)).toHaveLength(10)
  })

  it('returns exactly the multiplication results for table 3', () => {
    const hints = getMultiplyHints(3)
    const expected = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]
    expect([...hints].sort((a, b) => a - b)).toEqual(expected)
  })

  it('returns exactly the multiplication results for table 10', () => {
    const hints = getMultiplyHints(10)
    const expected = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    expect([...hints].sort((a, b) => a - b)).toEqual(expected)
  })
})
