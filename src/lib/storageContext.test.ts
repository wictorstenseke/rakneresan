import { describe, it, expect, vi } from 'vitest'

const mockAdapter = vi.hoisted(() => ({
  getUser: vi.fn(),
  saveTableData: vi.fn(),
  createUser: vi.fn(),
  validatePin: vi.fn(),
  logCompletion: vi.fn(),
  saveCompletedRound: vi.fn().mockResolvedValue(undefined),
  addCredits: vi.fn().mockResolvedValue(undefined),
  addPeekSavers: vi.fn().mockResolvedValue(undefined),
  consumePeekSaver: vi.fn().mockResolvedValue(true),
  spendCreditsAndTrackPurchase: vi.fn().mockResolvedValue(true),
}))

vi.mock('./storage.firebase', () => ({
  firebaseStorageAdapter: mockAdapter,
}))

import { storage } from './storageContext'

describe('storageContext', () => {
  it('exports storage as the cached firebase adapter wrapper', () => {
    expect(storage).not.toBe(mockAdapter)
    expect(typeof storage.getUser).toBe('function')
    expect(typeof storage.saveTableData).toBe('function')
  })

  it('storage implements StorageAdapter interface', () => {
    expect(typeof storage.getUser).toBe('function')
    expect(typeof storage.saveTableData).toBe('function')
    expect(typeof storage.createUser).toBe('function')
    expect(typeof storage.validatePin).toBe('function')
    expect(typeof storage.logCompletion).toBe('function')
    expect(typeof storage.saveCompletedRound).toBe('function')
    expect(typeof storage.addCredits).toBe('function')
    expect(typeof storage.addPeekSavers).toBe('function')
    expect(typeof storage.consumePeekSaver).toBe('function')
    expect(typeof storage.spendCreditsAndTrackPurchase).toBe('function')
  })
})
