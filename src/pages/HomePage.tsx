import { useState, useEffect } from 'preact/hooks'
import { ThemeToggle } from '../components/ThemeToggle'
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
          <ThemeToggle />
          <button class="stats-chip" onClick={onStats}>📊 Statistik</button>
          <button type="button" class="user-chip" onClick={onLogout}>
            🚪 Logga ut
          </button>
        </div>
      </div>

      <div class="flex-1 flex flex-col justify-center w-full max-w-[900px] max-sm:portrait:justify-start">
        {/* Operation tabs */}
        <div class="flex flex-wrap gap-1.5">
          {TABS.map(tab => {
            const active = activeOp === tab.op
            return (
              <button
                key={tab.op}
                type="button"
                class={`py-1.5 px-3.5 min-h-9 border-2 rounded-xl font-[Nunito] text-[0.9rem] font-bold text-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,.08)] transition-[background,color,border-color] duration-200 touch-manipulation ${active ? 'text-white border-transparent shadow-[0_3px_12px_rgba(0,0,0,.15)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'}`}
                style={active ? `background:${tab.gradient}` : ''}
                onClick={() => handleTabChange(tab.op)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div class={`grid gap-6 w-full max-w-[900px] pt-6 op-content ${activeOp !== 'multiply' ? 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(160px,1fr))]'}`}>
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
                    <div class="text-[.8rem] font-bold text-[var(--text-muted)] uppercase tracking-[.08em] mb-3">{cat.label}</div>
                  </>
                ) : (
                  <>
                    <div class="text-[2.4rem] leading-none mb-1.5 block">{cat.emoji}</div>
                    <div class="text-[.8rem] font-bold text-[var(--text-muted)] uppercase tracking-[.08em] mb-3">{cat.label}</div>
                  </>
                )}
                <div class="bg-[var(--progress-bg)] rounded-lg h-2 overflow-hidden mb-2">
                  <div class="progress-bar-fill" style={`transform:scaleX(${pct / 100})`} />
                </div>
                <div class="flex justify-center gap-2 flex-wrap">
                  <span class="flex items-center gap-0.5 text-xs font-extrabold py-0.5 px-2.5 rounded-full bg-[var(--success-bg)] text-[var(--success)]">✅ {clearN}/10</span>
                  {retryN > 0 && <span class="flex items-center gap-0.5 text-xs font-extrabold py-0.5 px-2.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning)]">🔄 {retryN}</span>}
                  {td.wins > 0 && <span class="flex items-center gap-0.5 text-xs font-extrabold py-0.5 px-2.5 rounded-full bg-[var(--info-bg)] text-[var(--info)]">🏆 {td.wins}×</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

