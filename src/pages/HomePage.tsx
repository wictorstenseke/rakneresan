import { useState, useEffect, useRef } from 'preact/hooks'
import { BalanceChip } from '../components/BalanceChip'
import { UserMenuChip } from '../components/UserMenuChip'
import { MULTIPLY_CATEGORIES, PLUS_CATEGORIES, MINUS_CATEGORIES, DIVIDE_CATEGORIES } from '../lib/constants'
import type { Operation, CategoryDef } from '../lib/constants'
import { storage } from '../lib/storageContext'
import type { TableData } from '../lib/storage'
import { getPreference, setPreference } from '../lib/preferences'

interface HomePageProps {
  user: string
  onSelectTable: (table: number) => void
  onLogout: () => void
  onStats: () => void
  onShop: () => void
}

const TABS: { op: Operation; label: string; gradient: string }[] = [
  { op: 'multiply', label: 'Multiplikation', gradient: 'linear-gradient(135deg, #FF6B6B, #FF9A3C)' },
  { op: 'divide',   label: 'Division',       gradient: 'linear-gradient(135deg, #4CC9F0, #4361EE)' },
  { op: 'add',      label: 'Addition',       gradient: 'linear-gradient(135deg, #6BCB77, #00C9A7)' },
  { op: 'subtract', label: 'Subtraktion',    gradient: 'linear-gradient(135deg, #C77DFF, #FF6FD8)' },
]

function getSavedHomeOperation(user: string): Operation {
  const saved = getPreference(user, 'home_active_op')
  if (saved === 'multiply' || saved === 'add' || saved === 'subtract' || saved === 'divide') {
    return saved
  }
  return 'multiply'
}

export function HomePage({ user, onSelectTable, onLogout, onStats, onShop }: HomePageProps) {
  const [tablesData, setTablesData] = useState<Record<number, TableData>>({})
  const [activeOp, setActiveOp] = useState<Operation>(() => getSavedHomeOperation(user))
  const [credits, setCredits] = useState(0)
  const [peekSavers, setPeekSavers] = useState(0)
  const tabsScrollRef = useRef<HTMLDivElement>(null)
  const [tabsAtStart, setTabsAtStart] = useState(true)
  const [tabsAtEnd, setTabsAtEnd] = useState(false)

  useEffect(() => {
    const load = async () => {
      const userData = await storage.getUser(user)
      if (userData) {
        setTablesData(userData.tables)
        setCredits(userData.credits ?? 0)
        setPeekSavers(userData.peekSavers ?? 0)
      }
    }
    void load()
  }, [user])

  useEffect(() => {
    setActiveOp(getSavedHomeOperation(user))
  }, [user])

  useEffect(() => {
    const el = tabsScrollRef.current
    if (!el) return
    const check = () => {
      setTabsAtStart(el.scrollLeft <= 1)
      setTabsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
    }
    check()
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', check)
      ro.disconnect()
    }
  }, [])

  const handleTabChange = (op: Operation) => {
    setActiveOp(op)
    setPreference(user, 'home_active_op', op)
  }

  const categories: CategoryDef[] =
    activeOp === 'multiply' ? MULTIPLY_CATEGORIES
    : activeOp === 'add'    ? PLUS_CATEGORIES
    : activeOp === 'divide' ? DIVIDE_CATEGORIES
    :                         MINUS_CATEGORIES

  return (
    <div class="screen active home-screen">
      <div class="top-bar flex flex-col min-[570px]:flex-row min-[570px]:items-center min-[570px]:justify-between gap-1 min-[570px]:gap-3">
        <div class="flex justify-end min-[570px]:order-2">
          <div class="top-bar-actions flex items-center gap-2">
            <BalanceChip type="credits" count={credits} onShopClick={onShop} />
            <BalanceChip type="savers" count={peekSavers} onShopClick={onShop} />
            <UserMenuChip user={user} onHome={() => {}} onStats={onStats} onShop={onShop} onLogout={onLogout} variant="home" />
          </div>
        </div>
        <h1 class="text-center min-[570px]:text-left min-[570px]:order-1 mt-6 min-[570px]:mt-0 flex items-center justify-center min-[570px]:justify-start gap-2">
          <img src="/rocket.svg" alt="" class="w-8 h-8 shrink-0" aria-hidden />
          Räkneresan
        </h1>
      </div>

      <div class="flex-1 flex flex-col justify-center landscape:justify-start landscape:pt-[80px] w-full max-w-[900px] max-sm:portrait:justify-start gap-6">
        {/* Operation tabs */}
        <div class="relative max-sm:portrait:-mx-5">
          <div class="hidden max-sm:portrait:block absolute left-0 top-0 bottom-0 w-10 bg-linear-to-r from-(--bg) to-transparent pointer-events-none z-10 transition-opacity duration-200" style={tabsAtStart ? 'opacity:0' : ''} />
          <div ref={tabsScrollRef} class="flex flex-wrap gap-1.5 max-sm:portrait:flex-nowrap max-sm:portrait:overflow-x-auto max-sm:portrait:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map(tab => {
              const active = activeOp === tab.op
              return (
                <button
                  key={tab.op}
                  type="button"
                  class={`op-tab shrink-0 py-1.5 px-5 max-sm:portrait:px-3 min-h-9 rounded-xl font-[Nunito] text-[0.9rem] font-bold text-center cursor-pointer touch-manipulation outline-none ${active ? 'active text-white shadow-[0_3px_12px_rgba(0,0,0,.15)]' : 'border-2 border-(--border) bg-(--surface) text-(--text-secondary) shadow-[0_2px_8px_rgba(0,0,0,.08)]'}`}
                  style={active ? `background:${tab.gradient}` : ''}
                  onClick={() => handleTabChange(tab.op)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div class="hidden max-sm:portrait:block absolute right-0 top-0 bottom-0 w-10 bg-linear-to-l from-(--bg) to-transparent pointer-events-none z-10 transition-opacity duration-200" style={tabsAtEnd ? 'opacity:0' : ''} />
        </div>

        <div class={`grid gap-6 w-full max-w-[900px] op-content ${activeOp !== 'multiply' ? 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(160px,1fr))]'}`}>
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
                    <div class="text-[.8rem] font-bold text-(--text-muted) uppercase tracking-[.08em] mb-3">{cat.label}</div>
                  </>
                ) : (
                  <>
                    <div class="text-[2.4rem] leading-none mb-1.5 block">{cat.emoji}</div>
                    <div class="text-[.8rem] font-bold text-(--text-muted) uppercase tracking-[.08em] mb-3">{cat.label}</div>
                  </>
                )}
                <div class="bg-(--progress-bg) rounded-lg h-2 overflow-hidden mb-2">
                  <div class="progress-bar-fill" style={`transform:scaleX(${pct / 100})`} />
                </div>
                <div class="flex justify-center gap-2 flex-wrap mt-auto">
                  <span class="flex items-center gap-0.5 text-xs font-extrabold py-0.5 px-2.5 rounded-full bg-(--success-bg) text-(--success)">✅ {clearN}/10</span>
                  {retryN > 0 && <span class="flex items-center gap-0.5 text-xs font-extrabold py-0.5 px-2.5 rounded-full bg-(--warning-bg) text-(--warning)">🔄 {retryN}</span>}
                  {td.wins > 0 && <span class="flex items-center gap-0.5 text-xs font-extrabold py-0.5 px-2.5 rounded-full bg-(--info-bg) text-(--info)">🏆 {td.wins}×</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
