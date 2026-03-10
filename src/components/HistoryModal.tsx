import { getCategoryDef } from '../lib/constants'
import { Modal } from './Modal'
import type { CompletionEntry } from '../lib/storage'

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  log: CompletionEntry[]
}

export function HistoryModal({ isOpen, onClose, log }: HistoryModalProps) {
  const sorted = [...log].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Historik"
      ariaLabel="Avklaringshistorik"
      closeAriaLabel="Stäng historik"
      className="history-modal"
    >
      <div class="history-modal-body">
        {sorted.length === 0 ? (
          <p class="history-empty">
            Inga avklarade tabeller ännu!
          </p>
        ) : (
          sorted.map((entry, i) => {
            const cat = getCategoryDef(entry.table)
            const emoji = cat?.emoji ?? '❓'
            const name = cat?.label ?? `Kategori ${entry.table}`
            const date = new Date(entry.timestamp).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })
            return (
              <div
                key={i}
                class="history-row"
                style={{ '--hc': cat?.color ?? 'var(--text-muted)' } as Record<string, string>}
              >
                <span class="history-table-chip">{emoji} {name}</span>
                <span class="history-date">{date}</span>
              </div>
            )
          })
        )}
      </div>
    </Modal>
  )
}
