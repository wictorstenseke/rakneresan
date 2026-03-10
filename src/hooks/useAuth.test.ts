import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const {
  mockOnAuthStateChanged, mockSignOut, mockStorage,
} = vi.hoisted(() => ({
  mockOnAuthStateChanged: vi.fn(),
  mockSignOut: vi.fn(),
  mockStorage: {
    createUser: vi.fn(),
    validatePin: vi.fn(),
    getUser: vi.fn(),
    saveTableData: vi.fn(),
    logCompletion: vi.fn(),
    saveCompletedRound: vi.fn(),
  },
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

const mockAuth = {}
vi.mock('../lib/firebase', () => ({
  getFirebaseAuth: () => Promise.resolve(mockAuth),
}))

vi.mock('../lib/savedUsers', () => ({
  saveUser: vi.fn(),
}))

vi.mock('../lib/storageContext', () => ({
  storage: mockStorage,
}))

import { useAuth } from './useAuth'
import { saveUser } from '../lib/savedUsers'

import { createElement } from 'preact'
import { render } from 'preact'
import { act } from 'preact/test-utils'

interface RenderHookResult<T> {
  result: { current: T }
  unmount: () => void
}

async function renderHookCustom<T>(hookFn: () => T): Promise<RenderHookResult<T>> {
  const result: { current: T } = { current: undefined as unknown as T }

  function TestComponent() {
    result.current = hookFn()
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)

  await act(() => {
    render(createElement(TestComponent, null), container)
  })

  return {
    result,
    unmount: () => {
      render(null, container)
      document.body.removeChild(container)
    },
  }
}

describe('useAuth', () => {
  let authStateCallback: ((user: { email: string } | null) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    authStateCallback = null
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: { email: string } | null) => void) => {
      authStateCallback = cb
      return vi.fn() // unsubscribe
    })
    mockSignOut.mockResolvedValue(undefined)
  })

  afterEach(() => {
    authStateCallback = null
  })

  describe('initial state', () => {
    it('starts with currentUser null and authReady false', async () => {
      const { result, unmount } = await renderHookCustom(() => useAuth())
      expect(result.current.currentUser).toBeNull()
      expect(result.current.authReady).toBe(false)
      unmount()
    })

    it('sets authReady true and currentUser after onAuthStateChanged fires', async () => {
      const { result, unmount } = await renderHookCustom(() => useAuth())
      // Wait for async Firebase init to complete
      await act(async () => { await new Promise(r => setTimeout(r, 0)) })
      await act(() => { authStateCallback?.({ email: 'alice@matte.kort' }) })
      expect(result.current.authReady).toBe(true)
      expect(result.current.currentUser).toBe('alice')
      unmount()
    })

    it('sets currentUser null when no user is signed in', async () => {
      const { result, unmount } = await renderHookCustom(() => useAuth())
      await act(async () => { await new Promise(r => setTimeout(r, 0)) })
      await act(() => { authStateCallback?.(null) })
      expect(result.current.authReady).toBe(true)
      expect(result.current.currentUser).toBeNull()
      unmount()
    })
  })

  describe('login validation', () => {
    it('rejects empty username', async () => {
      const { result, unmount } = await renderHookCustom(() => useAuth())
      const res = await result.current.login('', '1234')
      expect(res.success).toBe(false)
      expect(res.error).toBeTruthy()
      unmount()
    })

    it('rejects whitespace-only username', async () => {
      const { result, unmount } = await renderHookCustom(() => useAuth())
      const res = await result.current.login('   ', '1234')
      expect(res.success).toBe(false)
      unmount()
    })

    it('rejects username with spaces', async () => {
      const { result, unmount } = await renderHookCustom(() => useAuth())
      const res = await result.current.login('wictor sten', '1234')
      expect(res.success).toBe(false)
      expect(res.error).toContain('mellanslag')
      unmount()
    })

    it('rejects non-4-digit PIN', async () => {
      const { result, unmount } = await renderHookCustom(() => useAuth())
      const res1 = await result.current.login('alice', '123')
      expect(res1.success).toBe(false)
      expect(res1.error).toContain('4')

      const res2 = await result.current.login('alice', '12345')
      expect(res2.success).toBe(false)

      const res3 = await result.current.login('alice', 'abcd')
      expect(res3.success).toBe(false)
      unmount()
    })

    it('trims and lowercases username', async () => {
      mockStorage.createUser.mockResolvedValue(undefined)
      const { result, unmount } = await renderHookCustom(() => useAuth())
      await result.current.login('  Alice  ', '1234')
      expect(mockStorage.createUser).toHaveBeenCalledWith('alice', '1234')
      unmount()
    })
  })

  describe('login create-user success', () => {
    it('returns success and sets currentUser when createUser succeeds', async () => {
      mockStorage.createUser.mockResolvedValue(undefined)
      const { result, unmount } = await renderHookCustom(() => useAuth())

      const res = await result.current.login('bob', '5678')
      expect(res.success).toBe(true)
      expect(result.current.currentUser).toBe('bob')
      expect(saveUser).toHaveBeenCalledWith('bob', '5678')
      unmount()
    })
  })

  describe('login email-already-in-use fallback', () => {
    it('falls back to validatePin when user exists and PIN is correct', async () => {
      mockStorage.createUser.mockRejectedValue({ code: 'auth/email-already-in-use' })
      mockStorage.validatePin.mockResolvedValue(true)
      const { result, unmount } = await renderHookCustom(() => useAuth())

      const res = await result.current.login('alice', '1234')
      expect(res.success).toBe(true)
      expect(mockStorage.validatePin).toHaveBeenCalledWith('alice', '1234')
      expect(result.current.currentUser).toBe('alice')
      unmount()
    })

    it('returns error when user exists but PIN is wrong', async () => {
      mockStorage.createUser.mockRejectedValue({ code: 'auth/email-already-in-use' })
      mockStorage.validatePin.mockResolvedValue(false)
      const { result, unmount } = await renderHookCustom(() => useAuth())

      const res = await result.current.login('alice', '9999')
      expect(res.success).toBe(false)
      expect(res.error).toContain('upptaget')
      unmount()
    })
  })

  describe('login error mapping', () => {
    it('returns network error for auth/network-request-failed', async () => {
      mockStorage.createUser.mockRejectedValue({ code: 'auth/network-request-failed' })
      const { result, unmount } = await renderHookCustom(() => useAuth())

      const res = await result.current.login('alice', '1234')
      expect(res.success).toBe(false)
      expect(res.error).toBeTruthy()
      unmount()
    })

    it('returns rate-limit error for auth/too-many-requests', async () => {
      mockStorage.createUser.mockRejectedValue({ code: 'auth/too-many-requests' })
      const { result, unmount } = await renderHookCustom(() => useAuth())

      const res = await result.current.login('alice', '1234')
      expect(res.success).toBe(false)
      expect(res.error).toBeTruthy()
      unmount()
    })

    it('returns generic error for unknown error codes', async () => {
      mockStorage.createUser.mockRejectedValue({ code: 'auth/internal-error' })
      const { result, unmount } = await renderHookCustom(() => useAuth())

      const res = await result.current.login('alice', '1234')
      expect(res.success).toBe(false)
      expect(res.error).toBeTruthy()
      unmount()
    })
  })

  describe('logout', () => {
    it('calls signOut and clears currentUser', async () => {
      mockStorage.createUser.mockResolvedValue(undefined)
      const { result, unmount } = await renderHookCustom(() => useAuth())

      // Log in first
      await result.current.login('alice', '1234')
      expect(result.current.currentUser).toBe('alice')

      // Log out
      await act(async () => { await result.current.logout() })
      expect(mockSignOut).toHaveBeenCalled()
      expect(result.current.currentUser).toBeNull()
      unmount()
    })
  })
})
