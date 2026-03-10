import type { StorageAdapter, UserData, TableData } from './storage'

const KEY = 'mattekort_db'

interface UserRecord {
  pin: string
  tables: Record<number, TableData>
  credits?: number
  peekSavers?: number
  purchaseCounts?: Record<string, number>
}

function loadAll(): Record<string, UserRecord> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, UserRecord>
  } catch {
    return {}
  }
}

function saveAll(data: Record<string, UserRecord>): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export const localStorageAdapter: StorageAdapter = {
  async getUser(username: string): Promise<UserData | null> {
    const all = loadAll()
    if (!all[username]) return null
    const rec = all[username]
    return {
      tables: rec.tables || {},
      credits: rec.credits ?? 0,
      peekSavers: rec.peekSavers ?? 0,
      purchaseCounts: rec.purchaseCounts ?? {},
    }
  },

  async saveTableData(username: string, table: number, data: TableData): Promise<void> {
    const all = loadAll()
    if (!all[username]) return
    all[username].tables[table] = data
    saveAll(all)
  },

  async createUser(username: string, pin: string): Promise<void> {
    const all = loadAll()
    all[username] = { pin, tables: {}, credits: 0, peekSavers: 0, purchaseCounts: {} }
    saveAll(all)
  },

  async validatePin(username: string, pin: string): Promise<boolean> {
    const all = loadAll()
    return all[username]?.pin === pin
  },

  async logCompletion(_username: string, _table: number): Promise<void> {
    // No-op for local adapter (inactive)
  },

  async saveCompletedRound(username: string, table: number, data: TableData): Promise<void> {
    await this.saveTableData(username, table, data)
  },

  async addCredits(username: string, amount: number): Promise<void> {
    const all = loadAll()
    if (!all[username]) return
    all[username].credits = (all[username].credits ?? 0) + amount
    saveAll(all)
  },

  async addPeekSavers(username: string, amount: number): Promise<void> {
    const all = loadAll()
    if (!all[username]) return
    all[username].peekSavers = (all[username].peekSavers ?? 0) + amount
    saveAll(all)
  },

  async consumePeekSaver(username: string): Promise<boolean> {
    const all = loadAll()
    if (!all[username]) return false
    const current = all[username].peekSavers ?? 0
    if (current <= 0) return false
    all[username].peekSavers = current - 1
    saveAll(all)
    return true
  },

  async spendCreditsAndTrackPurchase(username: string, cost: number, itemId: string): Promise<boolean> {
    const all = loadAll()
    if (!all[username]) return false
    const current = all[username].credits ?? 0
    if (current < cost) return false
    all[username].credits = current - cost
    const counts = all[username].purchaseCounts ?? {}
    counts[itemId] = (counts[itemId] ?? 0) + 1
    all[username].purchaseCounts = counts
    saveAll(all)
    return true
  },
}
