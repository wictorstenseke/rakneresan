import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getPreference, setPreference } from './preferences'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('getPreference', () => {
  it('returns null when key does not exist', () => {
    expect(getPreference('alice', 'theme')).toBeNull()
  })

  it('returns stored value when it exists', () => {
    setPreference('alice', 'theme', 'dark')
    expect(getPreference('alice', 'theme')).toBe('dark')
  })

  it('uses correct key format (user + key combined)', () => {
    setPreference('alice', 'handedness', 'right')
    expect(localStorage.getItem('mattekort_pref_alice_handedness')).toBe('right')
  })

  it('returns null when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    expect(getPreference('alice', 'theme')).toBeNull()
  })
})

describe('setPreference', () => {
  it('stores value that getPreference can retrieve', () => {
    setPreference('bob', 'handedness', 'left')
    expect(getPreference('bob', 'handedness')).toBe('left')
  })

  it('does not throw when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })
    expect(() => setPreference('alice', 'theme', 'dark')).not.toThrow()
  })
})
