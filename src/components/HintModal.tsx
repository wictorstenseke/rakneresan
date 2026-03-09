import { useEffect, useRef } from 'preact/hooks'
import { TEN_FRIENDS_CATEGORY_ID } from '../lib/constants'
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

function getMultiplyHints(table: number): number[] {
  const hints = Array.from({ length: 10 }, (_, i) => (i + 1) * table)
  for (let i = hints.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[hints[i], hints[j]] = [hints[j], hints[i]]
  }
  return hints
}

function opSymbol(operation: Operation): string {
  if (operation === 'add') return '+'
  if (operation === 'subtract') return '−'
  return '×'
}

export function HintModal({ categoryId, operation, isOpen, onClose, tableColor, equations }: HintModalProps) {
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

  const isMultiply = operation === 'multiply'
  const isTenFriends = categoryId === TEN_FRIENDS_CATEGORY_ID && operation === 'add'
  const title = isMultiply
    ? `${TABLE_NAMES[categoryId - 1] ?? `${categoryId}ans`} tabell`
    : operation === 'add' ? 'Plus-hjälp' : 'Minus-hjälp'

  return (
    <div
      class="hint-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        class="hint-modal"
        style={{ '--hint-tc': tableColor } as Record<string, string>}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="hint-modal-header">
          <span class="hint-modal-title">💡 {title}</span>
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
      </div>
    </div>
  )
}
