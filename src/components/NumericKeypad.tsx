import { useState, useCallback, useEffect, useRef } from 'preact/hooks'
import { getPreference, setPreference } from '../lib/preferences'

interface NumericKeypadProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  user: string
  onPeek?: () => void
  onHint?: () => void
  flipped?: boolean
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['⌫', '0', '✓'],
]

const HAND_PREF_KEY = 'handedness'

export function NumericKeypad({ value, onChange, onSubmit, disabled, user, onPeek, onHint, flipped }: NumericKeypadProps) {
  const [rightHanded, setRightHanded] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [peekConfirming, setPeekConfirming] = useState(false)

  // Load persisted handedness preference
  useEffect(() => {
    const saved = getPreference(user, HAND_PREF_KEY)
    if (saved !== null) {
      setRightHanded(saved === 'right')
    }
  }, [user])

  const toggleHand = useCallback(() => {
    setIsSwitching(true)
    setTimeout(() => setIsSwitching(false), 400)
    setRightHanded(prev => {
      const next = !prev
      setPreference(user, HAND_PREF_KEY, next ? 'right' : 'left')
      return next
    })
  }, [user])

  // Reset peek confirmation after 2s if user doesn't confirm
  useEffect(() => {
    if (!peekConfirming) return
    const t = setTimeout(() => setPeekConfirming(false), 2000)
    return () => clearTimeout(t)
  }, [peekConfirming])

  const handlePeekClick = useCallback(() => {
    if (!onPeek) return
    if (peekConfirming) {
      onPeek()
      setPeekConfirming(false)
    } else {
      setPeekConfirming(true)
    }
  }, [onPeek, peekConfirming])

  const handleKey = useCallback((key: string) => {
    if (disabled) return

    if (key === '⌫') {
      onChange(value.slice(0, -1))
    } else if (key === '✓') {
      onSubmit()
    } else {
      if (value.length < 3) {
        onChange(value + key)
      }
    }
  }, [value, onChange, onSubmit, disabled])

  const gridRef = useRef<HTMLDivElement>(null)

  const handleGridClick = useCallback((e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('button[data-key]') as HTMLButtonElement | null
    if (!btn || btn.disabled) return
    handleKey(btn.dataset.key!)
  }, [handleKey])

  return (
    <div class={`keypad-wrapper${rightHanded ? ' right-handed' : ' left-handed'}${isSwitching ? ' switching' : ''}`}>
      <div class="keypad-grid" ref={gridRef} onClick={handleGridClick}>
        {KEYS.map((row, ri) =>
          row.map((key) => {
            const isAction = key === '⌫' || key === '✓'
            return (
              <button
                key={`${ri}-${key}`}
                type="button"
                data-key={key}
                class={`keypad-key${key === '✓' ? ' key-submit' : ''}${key === '⌫' ? ' key-delete' : ''}${isAction ? '' : ' key-digit'}`}
                disabled={disabled && key !== '⌫'}
              >
                {key}
              </button>
            )
          })
        )}
      </div>
      <div class="h-px bg-black/[.08] my-3" />
      <div class="flex flex-col gap-2 w-full">
        {onHint && (
          <button
            type="button"
            class="btn-hint"
            onClick={onHint}
            aria-label="Öppna hjälp"
          >
            <span class="btn-icon">💡</span>
            <span class="btn-text">Hjälp</span>
          </button>
        )}
        <button
          type="button"
          class="hand-toggle"
          onClick={toggleHand}
          aria-label={rightHanded ? 'Flytta till vänster' : 'Flytta till höger'}
        >
          <span class="btn-icon">⌨️</span>
          <span class="btn-text">Byt sida</span>
        </button>
        {onPeek && (
          <button
            type="button"
            class={`btn-peek${peekConfirming ? ' btn-peek-confirming' : ''}`}
            onClick={handlePeekClick}
            disabled={flipped}
            aria-label={peekConfirming ? 'Bekräfta titta på svaret' : 'Titta på svaret'}
          >
            {!peekConfirming && <span class="btn-icon">👀</span>}
            <span class="btn-text">{peekConfirming ? 'Säker?' : 'Kolla svar'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
