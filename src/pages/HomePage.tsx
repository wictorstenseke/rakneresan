import { useState, useEffect } from 'preact/hooks'
import { MULTIPLY_CATEGORIES, PLUS_CATEGORIES, MINUS_CATEGORIES } from '../lib/constants'
import type { Operation, CategoryDef } from '../lib/constants'
import { storage } from '../lib/storageContext'
import type { TableData } from '../lib/storage'
import { getPreference, setPreference } from '../lib/preferences'

interface HomePageProps {
  user: string
  onSelectTable: (table: number) => void
  onLogout: () => void
  onStats: () => void
}

const TABS: { op: Operation; label: string; gradient: string }[] = [
  { op: 'multiply', label: 'Multiplikation', gradient: 'linear-gradient(135deg, #FF6B6B, #FF9A3C)' },
  { op: 'add',      label: 'Addition',       gradient: 'linear-gradient(135deg, #6BCB77, #00C9A7)' },
  { op: 'subtract', label: 'Subtraktion',    gradient: 'linear-gradient(135deg, #C77DFF, #FF6FD8)' },
]

function getSavedHomeOperation(user: string): Operation {
  const saved = getPreference(user, 'home_active_op')
  if (saved === 'multiply' || saved === 'add' || saved === 'subtract') {
    return saved
  }
  return 'multiply'
}

export function HomePage({ user, onSelectTable, onLogout, onStats }: HomePageProps) {
  const [tablesData, setTablesData] = useState<Record<number, TableData>>({})
  const [activeOp, setActiveOp] = useState<Operation>(() => getSavedHomeOperation(user))

  useEffect(() => {
    const load = async () => {
      const userData = await storage.getUser(user)
      if (userData) {
        setTablesData(userData.tables)
      }
    }
    void load()
  }, [user])

  useEffect(() => {
    setActiveOp(getSavedHomeOperation(user))
  }, [user])

  const handleTabChange = (op: Operation) => {
    setActiveOp(op)
    setPreference(user, 'home_active_op', op)
  }

  const categories: CategoryDef[] =
    activeOp === 'multiply' ? MULTIPLY_CATEGORIES
    : activeOp === 'add'    ? PLUS_CATEGORIES
    :                         MINUS_CATEGORIES

  return (
    <div class="screen active home-screen">
      <div class="top-bar flex flex-col gap-4 items-center md:flex-row md:justify-between md:items-center">
        <h1 class="text-center">🎯 Räkneresan</h1>
        <div class="top-bar-actions flex flex-wrap justify-center gap-2.5 md:flex-nowrap md:justify-end">
          <button class="stats-chip" onClick={onStats}>📊 Statistik</button>
          <button type="button" class="user-chip" onClick={onLogout}>
            🚪 Logga ut
          </button>
        </div>
      </div>

      <div class="tables-grid-wrapper">
        {/* Operation tabs */}
        <div class="op-tabs">
          {TABS.map(tab => (
            <button
              key={tab.op}
              type="button"
              class={`op-tab${activeOp === tab.op ? ' active' : ''}`}
              style={activeOp === tab.op ? `background:${tab.gradient}` : ''}
              onClick={() => handleTabChange(tab.op)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div class={`tables-grid op-content${activeOp !== 'multiply' ? ' tables-grid-sm' : ''}`}>
          {categories.map(cat => {
            const td: TableData = tablesData[cat.id] ?? { wins: 0, clear: [], retry: [] }
            const clearN = td.clear.length
            const retryN = td.retry.length
            const pct = Math.round((clearN / 10) * 100)

            return (
              <div
                key={cat.id}
                class={`table-card${td.wins > 0 ? ' has-wins' : ''}`}
                style={`--tc:${cat.color}`}
                onClick={() => onSelectTable(cat.id)}
              >
                <div class="completed-badge">{cat.emoji}</div>
                {activeOp === 'multiply' ? (
                  <>
                    <div class="table-num">{cat.id}</div>
                    <div class="table-label">Gångertabell</div>
                  </>
                ) : (
                  <>
                    <div class="table-op-emoji">{cat.emoji}</div>
                    <div class="table-label">{cat.label}</div>
                  </>
                )}
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
    </div>
  )
}

