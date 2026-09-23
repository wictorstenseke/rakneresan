import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockCreateUser, mockSignIn,
  mockGetDoc, mockGetDocFromCache, mockSetDoc, mockUpdateDoc, mockDoc, mockArrayUnion,
  mockBatchSet, mockBatchCommit, mockWriteBatch,
  mockAuth, mockDb,
} = vi.hoisted(() => {
  const mockAuth: { currentUser: { uid: string } | null } = { currentUser: null }
  const mockDb = {}
  const mockBatchSet = vi.fn()
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
  const mockWriteBatch = vi.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit }))
  return {
    mockCreateUser: vi.fn(),
    mockSignIn: vi.fn(),
    mockGetDoc: vi.fn(),
    mockGetDocFromCache: vi.fn(),
    mockSetDoc: vi.fn(),
    mockUpdateDoc: vi.fn(),
    mockDoc: vi.fn(),
    mockArrayUnion: vi.fn((...args: unknown[]) => ({ __arrayUnion: args })),
    mockBatchSet,
    mockBatchCommit,
    mockWriteBatch,
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
  getDocFromCache: (...args: unknown[]) => mockGetDocFromCache(...args),
  increment: (n: number) => ({ __increment: n }),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  arrayUnion: (...args: unknown[]) => mockArrayUnion(...args),
  writeBatch: (_db: unknown) => mockWriteBatch(),
  serverTimestamp: () => ({ __serverTimestamp: true }),
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

    it('creates a Firestore user doc with empty tables via batch', async () => {
      mockCreateUser.mockResolvedValue({ user: { uid: 'new-uid' } })

      await firebaseStorageAdapter.createUser('alice', '1234')

      expect(mockWriteBatch).toHaveBeenCalled()
      expect(mockBatchSet).toHaveBeenCalledWith('doc-ref', { tables: {}, credits: 0, peekSavers: 0, purchaseCounts: {} })
      expect(mockBatchCommit).toHaveBeenCalled()
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
        credits: 0,
        peekSavers: 0,
        purchaseCounts: {},
        activeCategories: null,
        creditsEnabled: true,
        spaceVideos: {},
        hiddenVideos: [],
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

  describe('offline', () => {
    const neverResolves = () => new Promise<never>(() => {})
    const cachedSnap = {
      exists: () => true,
      data: () => ({ tables: {}, completionLog: [{ table: 1, timestamp: 1 }], credits: 5, peekSavers: 1 }),
      ref: 'doc-ref',
    }

    it('writes return without waiting for server acknowledgement', async () => {
      mockUpdateDoc.mockImplementation(neverResolves)

      await firebaseStorageAdapter.saveTableData('alice', 5, { wins: 1, clear: [], retry: [] })
      await firebaseStorageAdapter.saveCompletedRound('alice', 5, { wins: 1, clear: [], retry: [] })
      await firebaseStorageAdapter.addCredits('alice', 3)

      expect(mockUpdateDoc).toHaveBeenCalledTimes(3)
    })

    it('logs instead of throwing when a queued write fails', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockUpdateDoc.mockRejectedValue(new Error('permission-denied'))

      await expect(firebaseStorageAdapter.addCredits('alice', 1)).resolves.toBeUndefined()
      await new Promise(r => setTimeout(r, 0))

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('falls back to the local cache when the server read hangs', async () => {
      vi.useFakeTimers()
      mockGetDoc.mockImplementation(neverResolves)
      mockGetDocFromCache.mockResolvedValue(cachedSnap)

      const pending = firebaseStorageAdapter.getUser('alice')
      await vi.advanceTimersByTimeAsync(3000)
      const result = await pending

      expect(result?.credits).toBe(5)
      vi.useRealTimers()
    })

    it('falls back to the local cache when the server read fails', async () => {
      mockGetDoc.mockRejectedValue(new Error('unavailable'))
      mockGetDocFromCache.mockResolvedValue(cachedSnap)

      const result = await firebaseStorageAdapter.getUser('alice')

      expect(result?.credits).toBe(5)
    })

    it('spends credits against cached data while offline', async () => {
      mockGetDoc.mockRejectedValue(new Error('unavailable'))
      mockGetDocFromCache.mockResolvedValue(cachedSnap)
      mockUpdateDoc.mockImplementation(neverResolves)

      await expect(firebaseStorageAdapter.spendCreditsAndTrackPurchase('alice', 5, 'item')).resolves.toBe(true)
      await expect(firebaseStorageAdapter.consumePeekSaver('alice')).resolves.toBe(true)
    })
  })
})
