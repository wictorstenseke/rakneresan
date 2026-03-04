export interface TableData {
  wins: number
  clear: number[]
  retry: number[]
}

export interface UserData {
  tables: Record<number, TableData>
}

export interface StorageAdapter {
  getUser(username: string): Promise<UserData | null>
  saveTableData(username: string, table: number, data: TableData): Promise<void>
  createUser(username: string, pin: string): Promise<void>
  validatePin(username: string, pin: string): Promise<boolean>
}
