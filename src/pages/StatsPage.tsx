import { useState, useEffect } from 'preact/hooks'
import { COLORS, EMOJIS, getCategoryDef } from '../lib/constants'
import { storage } from '../lib/storageContext'
import type { UserData, CompletionEntry } from '../lib/storage'
import { HistoryModal } from '../components/HistoryModal'

interface StatsPageProps {
  user: string
  onBack: () => void
}

interface Stats {
  mostPlayedTable: number | null
  hardestNumber: { table: number; n: number } | null
  easiestNumber: { table: number; n: number } | null
  totalWins: number
  totalClears: number
  totalRetries: number
  tableCompletions: Record<number, number> // table -> times completed
}

function computeStats(userData: UserData): Stats {
  const tables = userData.tables
  let mostPlayedTable: number | null = null
  let mostPlayedCount = 0
  let totalWins = 0
  let totalClears = 0
  let totalRetries = 0

  // Track per-table plays (wins = completed rounds, so we use wins + current progress as proxy)
  // Most played = table with most total wins
  const retryCountMap: Record<string, number> = {} // "table-n" -> count of retries
  const clearCountMap: Record<string, number> = {} // "table-n" -> count of clears

  for (const [tableStr, td] of Object.entries(tables)) {
    const t = parseInt(tableStr)
    const tablePlayCount = td.wins + (td.clear.length > 0 || td.retry.length > 0 ? 1 : 0)
    totalWins += td.wins
    totalClears += td.clear.length
    totalRetries += td.retry.length

    if (tablePlayCount > mostPlayedCount) {
      mostPlayedCount = tablePlayCount
      mostPlayedTable = t
    }

    for (const n of td.retry) {
      const key = `${t}-${n}`
      retryCountMap[key] = (retryCountMap[key] || 0) + 1
    }
    for (const n of td.clear) {
      const key = `${t}-${n}`
      clearCountMap[key] = (clearCountMap[key] || 0) + 1
    }
  }

  // Hardest number = in retry pile most
  let hardestNumber: { table: number; n: number } | null = null
  let maxRetries = 0
  for (const [key, count] of Object.entries(retryCountMap)) {
    if (count > maxRetries) {
      maxRetries = count
      const [t, n] = key.split('-').map(Number)
      hardestNumber = { table: t, n }
    }
  }

  // Easiest number = in clear pile most (across most tables)
  let easiestNumber: { table: number; n: number } | null = null
  let maxClears = 0
  for (const [key, count] of Object.entries(clearCountMap)) {
    if (count > maxClears) {
      maxClears = count
      const [t, n] = key.split('-').map(Number)
      easiestNumber = { table: t, n }
    }
  }

  const tableCompletions: Record<number, number> = {}
  for (let t = 1; t <= 10; t++) {
    const td = tables[t]
    tableCompletions[t] = td?.wins ?? 0
  }
  for (const id of [11, 12, 13, 21, 22, 23]) {
    const td = tables[id]
    if (td && td.wins > 0) tableCompletions[id] = td.wins
  }

  return { mostPlayedTable, hardestNumber, easiestNumber, totalWins, totalClears, totalRetries, tableCompletions }
}

export function StatsPage({ user, onBack }: StatsPageProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [completionLog, setCompletionLog] = useState<CompletionEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const load = async () => {
      const userData = await storage.getUser(user)
      if (userData) {
        setStats(computeStats(userData))
        setCompletionLog(userData.completionLog ?? [])
      } else {
        setStats({ mostPlayedTable: null, hardestNumber: null, easiestNumber: null, totalWins: 0, totalClears: 0, totalRetries: 0, tableCompletions: {} })
      }
    }
    void load()
  }, [user])

  if (!stats) {
    return <div class="screen active stats-screen" />
  }

  const hasData = stats.totalWins > 0 || stats.totalClears > 0 || stats.totalRetries > 0

  return (
    <div class="screen active stats-screen">
      <div class="stats-header flex flex-wrap gap-3 md:gap-4">
        <button type="button" class="back-chip" onClick={onBack} aria-label="Tillbaka">🔙</button>
        <h1 class="stats-title">Statistik</h1>
      </div>

      <div class="stats-content">
        {!hasData ? (
          <p class="stats-empty">Ingen data ännu! Spela lite först 🎮</p>
        ) : (
          <>
            <div class="stats-grid">
              <div class="stat-card" style={`--tc:${COLORS[4]}`}>
                <div class="stat-icon">🏆</div>
                <div class="stat-value">{stats.totalWins}</div>
                <div class="stat-desc">Totala vinster</div>
              </div>
              <div class="stat-card" style={`--tc:${COLORS[3]}`}>
                <div class="stat-icon">✅</div>
                <div class="stat-value">{stats.totalClears}</div>
                <div class="stat-desc">Klara kort</div>
              </div>
              <div class="stat-card" style={`--tc:${COLORS[1]}`}>
                <div class="stat-icon">🔄</div>
                <div class="stat-value">{stats.totalRetries}</div>
                <div class="stat-desc">Öva igen</div>
              </div>
            </div>

            <div class="stats-table-completions">
              <div class="stats-table-completions-header">
                <div class="stats-table-completions-title">Tabeller klara (antal gånger)</div>
                <button
                  type="button"
                  class="back-chip"
                  onClick={() => setShowHistory(true)}
                >
                  📋 Historik
                </button>
              </div>
              <div class="stats-table-completions-grid">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(t => (
                  <div key={t} class="stats-table-completion-item" style={`--tc:${COLORS[t - 1]}`}>
                    <span class="stats-table-num">{t}</span>
                    <span class="stats-table-emoji-count">
                      <span class="stats-table-emoji">{EMOJIS[t - 1]}</span>
                      <span class="stats-table-count">{stats.tableCompletions[t] ?? 0}×</span>
                    </span>
                  </div>
                ))}
              </div>
              {[11, 12, 13, 21, 22, 23].some(id => (stats.tableCompletions[id] ?? 0) > 0) && (
                <div class="stats-table-completions-grid" style="margin-top:8px">
                  {[11, 12, 13, 21, 22, 23].filter(id => (stats.tableCompletions[id] ?? 0) > 0).map(id => {
                    const cat = getCategoryDef(id)
                    return (
                      <div key={id} class="stats-table-completion-item" style={`--tc:${cat?.color ?? '#888'}`}>
                        <span class="stats-table-num">{cat?.emoji ?? '❓'}</span>
                        <span class="stats-table-emoji-count">
                          <span class="stats-table-emoji" style="font-size:0.7em;text-transform:uppercase">{cat?.label ?? `Kategori ${id}`}</span>
                          <span class="stats-table-count">{stats.tableCompletions[id]}×</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div class="stats-highlights">
              {stats.mostPlayedTable !== null && (() => {
                const cat = getCategoryDef(stats.mostPlayedTable)
                const color = cat?.color ?? COLORS[(stats.mostPlayedTable - 1) % COLORS.length]
                const emoji = cat?.emoji ?? EMOJIS[(stats.mostPlayedTable - 1) % EMOJIS.length]
                const label = cat?.label ?? `${stats.mostPlayedTable}:ans gångertabell`
                return (
                  <div class="highlight-row" style={`--tc:${color}`}>
                    <span class="highlight-icon" style={`color:${color}`}>{emoji}</span>
                    <div>
                      <div class="highlight-title">Mest spelade kategori</div>
                      <div class="highlight-value">{label}</div>
                    </div>
                  </div>
                )
              })()}

              {stats.hardestNumber !== null && (() => {
                const cat = getCategoryDef(stats.hardestNumber.table)
                const color = cat?.color ?? COLORS[(stats.hardestNumber.table - 1) % COLORS.length]
                return (
                  <div class="highlight-row" style={`--tc:${color}`}>
                    <span class="highlight-icon">🔥</span>
                    <div>
                      <div class="highlight-title">Svårast tal</div>
                      <div class="highlight-value">
                        {cat?.operation === 'multiply'
                          ? `${stats.hardestNumber.table} × ${stats.hardestNumber.n} = ${stats.hardestNumber.table * stats.hardestNumber.n}`
                          : `${cat?.label ?? `Kategori ${stats.hardestNumber.table}`} – kort ${stats.hardestNumber.n}`
                        }
                      </div>
                    </div>
                  </div>
                )
              })()}

              {stats.easiestNumber !== null && (() => {
                const cat = getCategoryDef(stats.easiestNumber.table)
                const color = cat?.color ?? COLORS[(stats.easiestNumber.table - 1) % COLORS.length]
                return (
                  <div class="highlight-row" style={`--tc:${color}`}>
                    <span class="highlight-icon">⚡</span>
                    <div>
                      <div class="highlight-title">Lättaste tal</div>
                      <div class="highlight-value">
                        {cat?.operation === 'multiply'
                          ? `${stats.easiestNumber.table} × ${stats.easiestNumber.n} = ${stats.easiestNumber.table * stats.easiestNumber.n}`
                          : `${cat?.label ?? `Kategori ${stats.easiestNumber.table}`} – kort ${stats.easiestNumber.n}`
                        }
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </>
        )}
      </div>
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        log={completionLog}
      />
    </div>
  )
}
