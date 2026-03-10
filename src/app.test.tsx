import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/preact'
import { App } from './app'

const { mockUseAuth, mockStorage } = vi.hoisted(() => {
  return {
    mockUseAuth: vi.fn(),
    mockStorage: {
      getUser: vi.fn().mockResolvedValue({ tables: {}, completionLog: [] }),
      saveTableData: vi.fn().mockResolvedValue(undefined),
      createUser: vi.fn().mockResolvedValue(undefined),
      validatePin: vi.fn().mockResolvedValue(true),
      logCompletion: vi.fn().mockResolvedValue(undefined),
      saveCompletedRound: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('./lib/storageContext', () => ({
  storage: mockStorage,
}))

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('App', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('when authReady is false, shows Laddar...', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      authReady: false,
      login: vi.fn(),
      logout: vi.fn(),
    })
    const { getByText } = render(<App />)
    expect(getByText('Laddar...')).toBeTruthy()
  })

  it('when authReady and currentUser null, shows LoginPage', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      authReady: true,
      login: vi.fn(),
      logout: vi.fn(),
    })
    const { getByRole } = render(<App />)
    expect(getByRole('heading', { name: 'Räkneresan' })).toBeTruthy()
  })

  it('when authReady and currentUser set, shows HomePage', () => {
    mockUseAuth.mockReturnValue({
      currentUser: 'alice',
      authReady: true,
      login: vi.fn(),
      logout: vi.fn(),
    })
    const { getByText } = render(<App />)
    expect(getByText('Multiplikation')).toBeTruthy()
  })

  it('logout triggers logout and calls logout function', () => {
    const logout = vi.fn()
    mockUseAuth.mockReturnValue({
      currentUser: 'alice',
      authReady: true,
      login: vi.fn(),
      logout,
    })
    const { getByText } = render(<App />)
    fireEvent.click(getByText(/Logga ut/))
    expect(logout).toHaveBeenCalled()
  })
})
