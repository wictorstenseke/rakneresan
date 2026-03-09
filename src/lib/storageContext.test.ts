import { describe, it, expect, vi } from 'vitest'

const mockAdapter = vi.hoisted(() => ({
  getUser: vi.fn(),
  saveTableData: vi.fn(),
  createUser: vi.fn(),
  validatePin: vi.fn(),
  logCompletion: vi.fn(),
}))

vi.mock('./storage.firebase', () => ({
  firebaseStorageAdapter: mockAdapter,
}))

import { storage } from './storageContext'

describe('storageContext', () => {
  it('exports storage as the firebase adapter', () => {
    expect(storage).toBe(mockAdapter)
  })

  it('storage implements StorageAdapter interface', () => {
    expect(typeof storage.getUser).toBe('function')
    expect(typeof storage.saveTableData).toBe('function')
    expect(typeof storage.createUser).toBe('function')
    expect(typeof storage.validatePin).toBe('function')
    expect(typeof storage.logCompletion).toBe('function')
  })
})
