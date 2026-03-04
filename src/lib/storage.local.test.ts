import { describe, it, expect, beforeEach } from 'vitest'
import { localStorageAdapter } from './storage.local'

beforeEach(() => {
  localStorage.clear()
})

describe('createUser', () => {
  it('creates a new user that can be retrieved', async () => {
    await localStorageAdapter.createUser('alice', '1234')
    const user = await localStorageAdapter.getUser('alice')
    expect(user).not.toBeNull()
    expect(user?.tables).toEqual({})
  })

  it('overwrites an existing user', async () => {
    await localStorageAdapter.createUser('alice', '1234')
    await localStorageAdapter.saveTableData('alice', 3, { wins: 5, clear: [1], retry: [2] })
    await localStorageAdapter.createUser('alice', '5678')
    const user = await localStorageAdapter.getUser('alice')
    expect(user?.tables).toEqual({})
  })
})

describe('validatePin', () => {
  it('returns true for the correct PIN', async () => {
    await localStorageAdapter.createUser('alice', '1234')
    expect(await localStorageAdapter.validatePin('alice', '1234')).toBe(true)
  })

  it('returns false for a wrong PIN', async () => {
    await localStorageAdapter.createUser('alice', '1234')
    expect(await localStorageAdapter.validatePin('alice', '9999')).toBe(false)
  })

  it('returns false for a nonexistent user', async () => {
    expect(await localStorageAdapter.validatePin('ghost', '1234')).toBe(false)
  })
})

describe('getUser', () => {
  it('returns null for a user that does not exist', async () => {
    expect(await localStorageAdapter.getUser('ghost')).toBeNull()
  })

  it('returns empty tables after creation', async () => {
    await localStorageAdapter.createUser('bob', '0000')
    const user = await localStorageAdapter.getUser('bob')
    expect(user).toEqual({ tables: {} })
  })
})

describe('saveTableData', () => {
  it('saves and retrieves table data', async () => {
    await localStorageAdapter.createUser('alice', '1234')
    await localStorageAdapter.saveTableData('alice', 3, { wins: 1, clear: [1, 2, 3], retry: [4] })
    const user = await localStorageAdapter.getUser('alice')
    expect(user?.tables[3]).toEqual({ wins: 1, clear: [1, 2, 3], retry: [4] })
  })

  it('keeps other tables intact when saving one', async () => {
    await localStorageAdapter.createUser('alice', '1234')
    await localStorageAdapter.saveTableData('alice', 2, { wins: 0, clear: [5], retry: [] })
    await localStorageAdapter.saveTableData('alice', 5, { wins: 2, clear: [1], retry: [3] })
    const user = await localStorageAdapter.getUser('alice')
    expect(user?.tables[2]).toEqual({ wins: 0, clear: [5], retry: [] })
    expect(user?.tables[5]).toEqual({ wins: 2, clear: [1], retry: [3] })
  })

  it('does nothing for a nonexistent user', async () => {
    await expect(
      localStorageAdapter.saveTableData('ghost', 3, { wins: 0, clear: [], retry: [] }),
    ).resolves.toBeUndefined()
  })
})
