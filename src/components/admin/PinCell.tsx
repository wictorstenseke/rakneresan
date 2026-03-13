import { useState, useEffect } from 'preact/hooks'

export function PinCell({ pin }: { pin: string }) {
  const [revealed, setRevealed] = useState(false)

  const handleToggle = () => {
    setRevealed(r => !r)
  }

  // Auto-hide after 5 seconds when revealed
  useEffect(() => {
    if (!revealed) return
    const t = setTimeout(() => setRevealed(false), 5000)
    return () => clearTimeout(t)
  }, [revealed])

  return (
    <button
      type="button"
      onClick={handleToggle}
      class="pin-chip"
      aria-label={revealed ? 'Dölj PIN' : 'Visa PIN'}
    >
      <span>{revealed ? pin : '••••'}</span>
      <span class="pin-chip-icon">{revealed ? '🙈' : '🙉'}</span>
    </button>
  )
}
