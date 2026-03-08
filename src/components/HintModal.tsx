import { useEffect, useRef } from 'preact/hooks'

interface HintModalProps {
  table: number
  isOpen: boolean
  onClose: () => void
  tableColor: string
}

const TABLE_NAMES = [
  'Ettans', 'Tvåans', 'Treans', 'Fyrans', 'Femans',
  'Seans', 'Sjuans', 'Åttans', 'Nians', 'Tians',
]

function getTableHints(table: number): number[] {
  const hints = Array.from({ length: 10 }, (_, i) => (i + 1) * table)
  for (let i = hints.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[hints[i], hints[j]] = [hints[j], hints[i]]
  }
  return hints
}

export function HintModal({ table, isOpen, onClose, tableColor }: HintModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const hints = getTableHints(table)
  const tableName = TABLE_NAMES[table - 1] ?? `${table}ans`

  return (
    <div
      class="hint-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${tableName} tabell`}
      onClick={onClose}
    >
      <div
        class="hint-modal"
        style={{ '--hint-tc': tableColor } as Record<string, string>}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="hint-modal-header">
          <span class="hint-modal-title">💡 {tableName} tabell</span>
          <button
            ref={closeButtonRef}
            type="button"
            class="hint-close-btn"
            onClick={onClose}
            aria-label="Stäng hjälp"
          >
            ✕
          </button>
        </div>
        <div class="hint-chips" aria-hidden="true">
          {hints.map((n) => (
            <span key={n} class="hint-chip">{n}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
