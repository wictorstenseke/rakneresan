import type { StorageAdapter, UserData, TableData } from './storage'

const KEY = 'mattekort_db'

interface UserRecord {
  pin: string
  tables: Record<number, TableData>
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
    return { tables: all[username].tables || {} }
  },

  async saveTableData(username: string, table: number, data: TableData): Promise<void> {
    const all = loadAll()
    if (!all[username]) return
    all[username].tables[table] = data
    saveAll(all)
  },

  async createUser(username: string, pin: string): Promise<void> {
    const all = loadAll()
    all[username] = { pin, tables: {} }
    saveAll(all)
  },

  async validatePin(username: string, pin: string): Promise<boolean> {
    const all = loadAll()
    return all[username]?.pin === pin
  },
}
