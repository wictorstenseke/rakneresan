interface TopHeaderProps {
  showBack: boolean
  onBack: () => void
  children: preact.ComponentChildren
  maxWidth?: string
}

export function TopHeader({ showBack, onBack, children, maxWidth = '900px' }: TopHeaderProps) {
  return (
    <div
      class="top-header flex flex-row justify-between items-center gap-3"
      style={`max-width: ${maxWidth}`}
    >
      <div class="flex items-center min-w-0">
        {showBack && (
          <button
            type="button"
            class="back-chip"
            onClick={onBack}
            aria-label="Hem"
          >
            🏠 Hem
          </button>
        )}
      </div>
      <div class="flex flex-wrap justify-end gap-2.5 min-w-0">
        {children}
      </div>
    </div>
  )
}
