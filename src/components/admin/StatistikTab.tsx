import { useState } from 'preact/hooks'
import { ALL_CATEGORIES } from '../../lib/constants'
import type { SpaceUser } from '../../lib/storage'

export function StatistikTab({ users }: { users: SpaceUser[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-bold text-(--text)">Statistik</h2>
      {users.length === 0 && (
        <p class="text-(--text-muted) text-sm text-center py-4">Inga användare ännu</p>
      )}
      {users.map(u => {
        const isOpen = expanded === u.uid
        const gameData = u.gameData
        const completions = gameData?.completionLog ?? []
        const totalWins = Object.values(gameData?.tables ?? {}).reduce((s, t) => s + t.wins, 0)
        return (
          <div key={u.uid} class="rounded-2xl border border-(--border) overflow-hidden" style="background-color: var(--surface)">
            <button
              type="button"
              class="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer transition-colors duration-200 hover:bg-(--border)"
              onClick={() => setExpanded(isOpen ? null : u.uid)}
            >
              <span class="font-semibold text-(--text)">{u.username}</span>
              <span class="flex items-center gap-2">
                <span class="text-xs text-(--text-muted)">{totalWins} vinster</span>
                <span class="text-xs font-medium text-(--text-muted)">{isOpen ? 'DÖLJ' : 'VISA'}</span>
              </span>
            </button>
            {isOpen && (
              <div class="px-4 pb-4 border-t border-(--border)" style="background-color: var(--surface)">
                {gameData === null ? (
                  <p class="text-(--text-muted) text-sm pt-3">Ingen speldata ännu</p>
                ) : (
                  <>
                    <div class="grid grid-cols-2 gap-2 pt-3">
                      {ALL_CATEGORIES.filter(cat => (gameData.tables[cat.id]?.wins ?? 0) > 0).map(cat => (
                        <div
                          key={cat.id}
                          class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                          style={`background: ${cat.color}22; border: 1px solid ${cat.color};`}
                        >
                          <span>{cat.emoji}</span>
                          <span class="text-(--text) truncate">{cat.label}</span>
                          <span class="ml-auto font-semibold text-(--text)">{gameData.tables[cat.id]?.wins ?? 0}×</span>
                        </div>
                      ))}
                    </div>
                    {completions.length > 0 && (
                      <div class="mt-3">
                        <p class="text-sm font-medium text-(--text-muted) mb-2">Senaste 5 avklarade</p>
                        <div class="flex flex-col gap-1">
                          {[...completions].reverse().slice(0, 5).map((entry, i) => {
                            const cat = ALL_CATEGORIES.find(c => c.id === entry.table)
                            return (
                              <div key={i} class="flex items-center gap-2 text-xs text-(--text-muted)">
                                <span>{cat?.emoji ?? '?'}</span>
                                <span>{cat?.label ?? entry.table}</span>
                                <span class="ml-auto">{new Date(entry.timestamp).toLocaleDateString('sv-SE')}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
