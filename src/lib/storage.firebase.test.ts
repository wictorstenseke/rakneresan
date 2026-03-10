import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockCreateUser, mockSignIn,
  mockGetDoc, mockSetDoc, mockUpdateDoc, mockDoc, mockArrayUnion,
  mockAuth, mockDb,
} = vi.hoisted(() => {
  const mockAuth: { currentUser: { uid: string } | null } = { currentUser: null }
  const mockDb = {}
  return {
    mockCreateUser: vi.fn(),
    mockSignIn: vi.fn(),
    mockGetDoc: vi.fn(),
    mockSetDoc: vi.fn(),
    mockUpdateDoc: vi.fn(),
    mockDoc: vi.fn(),
    mockArrayUnion: vi.fn((...args: unknown[]) => ({ __arrayUnion: args })),
    mockAuth,
    mockDb,
  }
})

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
}))

vi.mock('firebase/firestore', () => ({
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  arrayUnion: (...args: unknown[]) => mockArrayUnion(...args),
}))

vi.mock('./firebase', () => ({
  getFirebaseAuth: () => Promise.resolve(mockAuth),
  getFirebaseDb: () => Promise.resolve(mockDb),
}))

import { firebaseStorageAdapter } from './storage.firebase'

describe('storage.firebase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.currentUser = { uid: 'test-uid-123' }
    mockDoc.mockReturnValue('doc-ref')
    mockSetDoc.mockResolvedValue(undefined)
    mockUpdateDoc.mockResolvedValue(undefined)
  })

  describe('createUser', () => {
    it('calls createUserWithEmailAndPassword with fake email and doubled PIN', async () => {
      mockCreateUser.mockResolvedValue({ user: { uid: 'new-uid' } })

      await firebaseStorageAdapter.createUser('alice', '1234')

      expect(mockCreateUser).toHaveBeenCalledWith(
        mockAuth,
        'alice@matte.kort',
        '12341234', // PIN is doubled
      )
    })

    it('creates a Firestore user doc with empty tables', async () => {
      mockCreateUser.mockResolvedValue({ user: { uid: 'new-uid' } })

      await firebaseStorageAdapter.createUser('alice', '1234')

      expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', { tables: {} })
    })
  })

  describe('validatePin', () => {
    it('returns true when signIn succeeds', async () => {
      mockSignIn.mockResolvedValue({ user: { uid: 'uid' } })

      const result = await firebaseStorageAdapter.validatePin('alice', '1234')

      expect(result).toBe(true)
      expect(mockSignIn).toHaveBeenCalledWith(
        mockAuth,
        'alice@matte.kort',
        '12341234',
      )
    })

    it('returns false for auth/wrong-password', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' })

      const result = await firebaseStorageAdapter.validatePin('alice', '9999')

      expect(result).toBe(false)
    })

    it('returns false for auth/invalid-credential', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' })

      const result = await firebaseStorageAdapter.validatePin('alice', '9999')

      expect(result).toBe(false)
    })

    it('returns false for auth/user-not-found', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/user-not-found' })

      const result = await firebaseStorageAdapter.validatePin('ghost', '1234')

      expect(result).toBe(false)
    })

    it('rethrows unknown errors', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/network-request-failed' })

      await expect(firebaseStorageAdapter.validatePin('alice', '1234'))
        .rejects.toEqual({ code: 'auth/network-request-failed' })
    })
  })

  describe('getUser', () => {
    it('throws when not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(firebaseStorageAdapter.getUser('alice'))
        .rejects.toThrow('Not authenticated')
    })

    it('returns null when doc does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })

      const result = await firebaseStorageAdapter.getUser('alice')

      expect(result).toBeNull()
    })

    it('returns user data when doc exists', async () => {
      const tables = { 3: { wins: 2, clear: [1, 2], retry: [3] } }
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ tables, completionLog: [{ table: 3, timestamp: 1000 }] }),
        ref: 'doc-ref',
      })

      const result = await firebaseStorageAdapter.getUser('alice')

      expect(result).toEqual({
        tables,
        completionLog: [{ table: 3, timestamp: 1000 }],
      })
    })

    it('backfills completionLog when empty', async () => {
      const tables = { 3: { wins: 2, clear: [1, 2], retry: [] } }
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ tables, completionLog: [] }),
        ref: 'doc-ref',
      })

      const result = await firebaseStorageAdapter.getUser('alice')

      // completionLog was empty, so backfill should create entries for 2 wins
      expect(mockUpdateDoc).toHaveBeenCalled()
      expect(result).not.toBeNull()
      expect(result!.completionLog).toHaveLength(2)
      expect(result!.completionLog![0].table).toBe(3)
    })
  })

  describe('saveTableData', () => {
    it('throws when not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(firebaseStorageAdapter.saveTableData('alice', 3, { wins: 1, clear: [1], retry: [] }))
        .rejects.toThrow('Not authenticated')
    })

    it('updates the correct table path in Firestore', async () => {
      const data = { wins: 1, clear: [1, 2], retry: [3] }

      await firebaseStorageAdapter.saveTableData('alice', 5, data)

      expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { 'tables.5': data })
    })
  })

  describe('logCompletion', () => {
    it('throws when not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(firebaseStorageAdapter.logCompletion('alice', 3))
        .rejects.toThrow('Not authenticated')
    })

    it('appends a completion entry using arrayUnion', async () => {
      await firebaseStorageAdapter.logCompletion('alice', 3)

      expect(mockUpdateDoc).toHaveBeenCalled()
      expect(mockArrayUnion).toHaveBeenCalled()
      const unionArg = mockArrayUnion.mock.calls[0][0] as { table: number; timestamp: number }
      expect(unionArg.table).toBe(3)
      expect(typeof unionArg.timestamp).toBe('number')
    })
  })

  describe('saveCompletedRound', () => {
    it('saves table data and logs completion in one write', async () => {
      const data = { wins: 1, clear: [] as number[], retry: [] as number[] }

      await firebaseStorageAdapter.saveCompletedRound('alice', 3, data)

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
      expect(mockArrayUnion).toHaveBeenCalled()
      const call = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
      expect(call['tables.3']).toEqual(data)
      expect(call.completionLog).toBeDefined()
    })
  })
})
