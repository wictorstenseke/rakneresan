import { useEffect, useRef } from 'preact/hooks'
import { getCategoryDef } from '../lib/constants'
import type { CompletionEntry } from '../lib/storage'

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  log: CompletionEntry[]
}

export function HistoryModal({ isOpen, onClose, log }: HistoryModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus()
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

  const sorted = [...log].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div
      class="hint-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Avklaringshistorik"
      onClick={onClose}
    >
      <div
        class="hint-modal history-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="hint-modal-header">
          <span class="hint-modal-title">Historik</span>
          <button
            ref={closeButtonRef}
            type="button"
            class="hint-close-btn"
            onClick={onClose}
            aria-label="Stäng historik"
          >
            ✕
          </button>
        </div>
        <div class="history-modal-body">
          {sorted.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: '16px 0' }}>
              Inga avklarade tabeller ännu!
            </p>
          ) : (
            sorted.map((entry, i) => {
              const cat = getCategoryDef(entry.table)
              const color = cat?.color ?? '#888'
              const emoji = cat?.emoji ?? '❓'
              const name = cat?.label ?? `Kategori ${entry.table}`
              const date = new Date(entry.timestamp).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })
              return (
                <div
                  key={i}
                  class="history-row"
                  style={{ '--hc': color } as Record<string, string>}
                >
                  <span class="history-table-chip">{emoji} {name}</span>
                  <span class="history-date">{date}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
