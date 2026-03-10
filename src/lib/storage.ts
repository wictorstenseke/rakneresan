export interface TableData {
  wins: number
  clear: number[]
  retry: number[]
  cardEquations?: Record<number, { a: number; b: number }>
}

export interface CompletionEntry {
  table: number      // category ID
  timestamp: number  // Date.now() in ms
}

export interface UserData {
  tables: Record<number, TableData>
  completionLog?: CompletionEntry[]
}

export interface StorageAdapter {
  getUser(username: string): Promise<UserData | null>
  saveTableData(username: string, table: number, data: TableData): Promise<void>
  createUser(username: string, pin: string): Promise<void>
  validatePin(username: string, pin: string): Promise<boolean>
  logCompletion(username: string, table: number): Promise<void>
  /** Save table reset + log completion in a single write (used on allClear). */
  saveCompletedRound(username: string, table: number, data: TableData): Promise<void>
}
