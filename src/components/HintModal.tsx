import { TEN_FRIENDS_CATEGORY_ID } from '../lib/constants'
import { getMultiplyHints, opSymbol } from '../lib/hint-utils'
import { Modal } from './Modal'
import type { Operation } from '../lib/constants'

interface HintModalProps {
  categoryId: number
  operation: Operation
  isOpen: boolean
  onClose: () => void
  tableColor: string
  equations?: Array<{ a: number; b: number }>
}

const TABLE_NAMES = [
  'Ettans', 'Tvåans', 'Treans', 'Fyrans', 'Femans',
  'Sexans', 'Sjuans', 'Åttans', 'Nians', 'Tians',
]

export function HintModal({ categoryId, operation, isOpen, onClose, tableColor, equations }: HintModalProps) {
  const isMultiply = operation === 'multiply'
  const isTenFriends = categoryId === TEN_FRIENDS_CATEGORY_ID && operation === 'add'
  const title = isMultiply
    ? `${TABLE_NAMES[categoryId - 1] ?? `${categoryId}ans`} tabell`
    : operation === 'add' ? 'Plus-hjälp' : 'Minus-hjälp'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`💡 ${title}`}
      ariaLabel={title}
      closeAriaLabel="Stäng hjälp"
      style={{ '--hint-tc': tableColor }}
    >
      <div class="hint-chips" aria-hidden="true">
        {isMultiply
          ? getMultiplyHints(categoryId).map((n) => (
              <span key={n} class="hint-chip">{n}</span>
            ))
          : (equations ?? []).map((eq, i) => (
              <span key={i} class="hint-chip hint-chip-eq">
                {isTenFriends ? `${eq.a} + ?` : `${eq.a} ${opSymbol(operation)} ${eq.b}`}
              </span>
            ))
        }
      </div>
    </Modal>
  )
}
