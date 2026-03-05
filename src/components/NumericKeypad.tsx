import { useState, useCallback, useEffect } from 'preact/hooks'
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
  const [pressedKey, setPressedKey] = useState<string | null>(null)
  const [rightHanded, setRightHanded] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)

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

  const handleKey = useCallback((key: string) => {
    if (disabled) return

    setPressedKey(key)
    setTimeout(() => setPressedKey(null), 150)

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

  return (
    <div class={`keypad-wrapper${rightHanded ? ' right-handed' : ' left-handed'}${isSwitching ? ' switching' : ''}`}>
      <div class="keypad-grid">
        {KEYS.map((row, ri) =>
          row.map((key) => {
            const isAction = key === '⌫' || key === '✓'
            return (
              <button
                key={`${ri}-${key}`}
                type="button"
                class={`keypad-key${pressedKey === key ? ' pressed' : ''}${key === '✓' ? ' key-submit' : ''}${key === '⌫' ? ' key-delete' : ''}${isAction ? '' : ' key-digit'}`}
                onClick={() => handleKey(key)}
                disabled={disabled && key !== '⌫'}
              >
                {key}
              </button>
            )
          })
        )}
      </div>
      <div class="keypad-toggle-separator" />
      <div class="keypad-toggle-row">
        {onPeek && (
          <button
            type="button"
            class="btn-peek"
            onClick={onPeek}
            disabled={flipped}
            aria-label="Titta på svaret"
          >
            <span class="btn-icon">👀</span>
            <span class="btn-text">Kolla svar</span>
          </button>
        )}
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
      </div>
    </div>
  )
}
