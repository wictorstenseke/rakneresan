import { COLORS, EMOJIS } from './constants'

const KEY = 'mattekort_saved_users'
const MAX = 6

interface SavedUser { username: string; pin: string }

function djb2(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return Math.abs(hash)
}

export function getSavedUsers(): SavedUser[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedUser[]) : []
  } catch {
    return []
  }
}

export function saveUser(username: string, pin: string): void {
  try {
    const users = getSavedUsers().filter(u => u.username !== username)
    users.unshift({ username, pin })
    localStorage.setItem(KEY, JSON.stringify(users.slice(0, MAX)))
  } catch {
    // ignore storage errors
  }
}

export function removeUser(username: string): void {
  try {
    const users = getSavedUsers().filter(u => u.username !== username)
    localStorage.setItem(KEY, JSON.stringify(users))
  } catch {
    // ignore storage errors
  }
}

export function getUserColor(username: string): string {
  return COLORS[djb2(username) % COLORS.length]
}

export function getUserEmoji(username: string): string {
  return EMOJIS[djb2(username) % EMOJIS.length]
}
