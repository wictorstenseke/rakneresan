import { describe, it, expect, beforeEach } from 'vitest'
import { COLORS, EMOJIS } from './constants'
import {
  getSavedUsers,
  saveUser,
  removeUser,
  getUserColor,
  getUserEmoji,
} from './savedUsers'

beforeEach(() => {
  localStorage.clear()
})

describe('getSavedUsers', () => {
  it('returns empty array when empty', () => {
    expect(getSavedUsers()).toEqual([])
  })

  it('returns parsed array when data exists', () => {
    saveUser('alice', '1234')
    const users = getSavedUsers()
    expect(users).toHaveLength(1)
    expect(users[0]).toEqual({ username: 'alice', pin: '1234' })
  })

  it('returns empty array when JSON is invalid', () => {
    localStorage.setItem('mattekort_saved_users', 'not valid json{{{')
    expect(getSavedUsers()).toEqual([])
  })
})

describe('saveUser', () => {
  it('adds user and moves to front', () => {
    saveUser('alice', '1234')
    saveUser('bob', '5678')
    const users = getSavedUsers()
    expect(users).toHaveLength(2)
    expect(users[0]).toEqual({ username: 'bob', pin: '5678' })
    expect(users[1]).toEqual({ username: 'alice', pin: '1234' })
  })

  it('re-adds existing user (moves to front, no duplicate)', () => {
    saveUser('alice', '1234')
    saveUser('bob', '5678')
    saveUser('alice', '9999')
    const users = getSavedUsers()
    expect(users).toHaveLength(2)
    expect(users[0]).toEqual({ username: 'alice', pin: '9999' })
    expect(users[1]).toEqual({ username: 'bob', pin: '5678' })
  })

  it('caps at 6 users (oldest dropped)', () => {
    for (let i = 1; i <= 8; i++) {
      saveUser(`user${i}`, `${i}`)
    }
    const users = getSavedUsers()
    expect(users).toHaveLength(6)
    expect(users.map(u => u.username)).toEqual([
      'user8', 'user7', 'user6', 'user5', 'user4', 'user3',
    ])
  })
})

describe('removeUser', () => {
  it('removes user; others remain', () => {
    saveUser('alice', '1234')
    saveUser('bob', '5678')
    removeUser('alice')
    const users = getSavedUsers()
    expect(users).toHaveLength(1)
    expect(users[0]).toEqual({ username: 'bob', pin: '5678' })
  })

  it('is no-op when user does not exist', () => {
    saveUser('alice', '1234')
    removeUser('ghost')
    const users = getSavedUsers()
    expect(users).toHaveLength(1)
    expect(users[0]).toEqual({ username: 'alice', pin: '1234' })
  })
})

describe('getUserColor', () => {
  it('returns a color from COLORS for any username', () => {
    const color = getUserColor('alice')
    expect(COLORS).toContain(color)
  })

  it('returns same color for same username (deterministic)', () => {
    expect(getUserColor('bob')).toBe(getUserColor('bob'))
  })
})

describe('getUserEmoji', () => {
  it('returns an emoji from EMOJIS for any username', () => {
    const emoji = getUserEmoji('alice')
    expect(EMOJIS).toContain(emoji)
  })

  it('returns same emoji for same username (deterministic)', () => {
    expect(getUserEmoji('bob')).toBe(getUserEmoji('bob'))
  })
})
