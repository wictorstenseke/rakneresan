import { useState, useEffect } from 'preact/hooks'
import { COLORS, EMOJIS } from '../lib/constants'
import { storage } from '../lib/storageContext'
import type { TableData } from '../lib/storage'

interface HomePageProps {
  user: string
  onSelectTable: (table: number) => void
  onLogout: () => void
}

export function HomePage({ user, onSelectTable, onLogout }: HomePageProps) {
  const [tablesData, setTablesData] = useState<Record<number, TableData>>({})

  useEffect(() => {
    const load = async () => {
      const userData = await storage.getUser(user)
      if (userData) {
        setTablesData(userData.tables)
      }
    }
    void load()
  }, [user])

  return (
    <div class="screen active home-screen">
      <div class="top-bar">
        <h1>🎯 Gångertabeller</h1>
        <div class="user-chip" onClick={onLogout}>
          👤 {user} ✕
        </div>
      </div>

      <div class="tables-grid">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(t => {
          const td: TableData = tablesData[t] ?? { wins: 0, clear: [], retry: [] }
          const color = COLORS[t - 1]
          const clearN = td.clear.length
          const retryN = td.retry.length
          const pct = Math.round((clearN / 10) * 100)

          return (
            <div
              key={t}
              class={`table-card${td.wins > 0 ? ' has-wins' : ''}`}
              style={`--tc:${color}`}
              onClick={() => onSelectTable(t)}
            >
              <div class="completed-badge">{EMOJIS[t - 1]}</div>
              <div class="table-num">{t}</div>
              <div class="table-label">Gångertabell</div>
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill" style={`width:${pct}%`} />
              </div>
              <div class="table-stats">
                <span class="stat-chip clear">✅ {clearN}/10</span>
                {retryN > 0 && <span class="stat-chip retry">🔄 {retryN}</span>}
                {td.wins > 0 && <span class="stat-chip wins">🏆 {td.wins}×</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
