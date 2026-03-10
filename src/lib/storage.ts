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
  credits?: number
  peekSavers?: number
  /** Maps item key (video ID or "peekSaver") to number of times purchased. */
  purchaseCounts?: Record<string, number>
}

export interface StorageAdapter {
  getUser(username: string): Promise<UserData | null>
  saveTableData(username: string, table: number, data: TableData): Promise<void>
  createUser(username: string, pin: string): Promise<void>
  validatePin(username: string, pin: string): Promise<boolean>
  logCompletion(username: string, table: number): Promise<void>
  /** Save table reset + log completion in a single write (used on allClear). */
  saveCompletedRound(username: string, table: number, data: TableData): Promise<void>
  /** Increment credits by amount. */
  addCredits(username: string, amount: number): Promise<void>
  /** Increment peekSavers by amount. */
  addPeekSavers(username: string, amount: number): Promise<void>
  /** Consume one peek saver. Returns false if balance was already 0. */
  consumePeekSaver(username: string): Promise<boolean>
  /**
   * Atomically spend `cost` credits and record a purchase of `itemId`.
   * Returns false if balance was insufficient.
   */
  spendCreditsAndTrackPurchase(username: string, cost: number, itemId: string): Promise<boolean>
}
