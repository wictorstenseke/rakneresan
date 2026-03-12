import { firebaseStorageAdapter } from './storage.firebase'
import type { StorageAdapter, UserData } from './storage'

const CACHE_TTL_MS = 30_000

interface CacheEntry {
  data: UserData
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

function getCached(username: string): UserData | null {
  const entry = cache.get(username)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(username)
    return null
  }
  return entry.data
}

function setCached(username: string, data: UserData): void {
  cache.set(username, { data, fetchedAt: Date.now() })
}

function updateCached(username: string, updater: (data: UserData) => void): void {
  const entry = cache.get(username)
  if (entry) updater(entry.data)
}

function withCache(adapter: StorageAdapter): StorageAdapter {
  return {
    async getUser(username) {
      const hit = getCached(username)
      if (hit) return hit
      const data = await adapter.getUser(username)
      if (data) setCached(username, data)
      return data
    },

    async saveTableData(username, table, data) {
      await adapter.saveTableData(username, table, data)
      updateCached(username, d => { d.tables[table] = data })
    },

    async saveCompletedRound(username, table, data) {
      await adapter.saveCompletedRound(username, table, data)
      updateCached(username, d => {
        d.tables[table] = data
        d.completionLog = [...(d.completionLog ?? []), { table, timestamp: Date.now() }]
      })
    },

    async logCompletion(username, table) {
      await adapter.logCompletion(username, table)
      updateCached(username, d => {
        d.completionLog = [...(d.completionLog ?? []), { table, timestamp: Date.now() }]
      })
    },

    async addCredits(username, amount) {
      await adapter.addCredits(username, amount)
      updateCached(username, d => { d.credits = (d.credits ?? 0) + amount })
    },

    async addPeekSavers(username, amount) {
      await adapter.addPeekSavers(username, amount)
      updateCached(username, d => { d.peekSavers = (d.peekSavers ?? 0) + amount })
    },

    async consumePeekSaver(username) {
      const result = await adapter.consumePeekSaver(username)
      if (result) updateCached(username, d => { d.peekSavers = Math.max(0, (d.peekSavers ?? 0) - 1) })
      return result
    },

    async spendCreditsAndTrackPurchase(username, cost, itemId) {
      const result = await adapter.spendCreditsAndTrackPurchase(username, cost, itemId)
      if (result) {
        updateCached(username, d => {
          d.credits = (d.credits ?? 0) - cost
          d.purchaseCounts = {
            ...d.purchaseCounts,
            [itemId]: ((d.purchaseCounts ?? {})[itemId] ?? 0) + 1,
          }
        })
      }
      return result
    },

    createUser: adapter.createUser.bind(adapter),
    validatePin: adapter.validatePin.bind(adapter),
  }
}

export const storage: StorageAdapter = withCache(firebaseStorageAdapter)
