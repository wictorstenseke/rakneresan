import { useEffect, useState } from 'preact/hooks'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function OfflineBadge() {
  const online = useOnlineStatus()
  const [dismissed, setDismissed] = useState(false)

  // Show the badge again the next time the connection drops
  useEffect(() => {
    if (online) setDismissed(false)
  }, [online])

  if (online || dismissed) return null

  return (
    <div
      role="status"
      class="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 pl-4 pr-1 rounded-full bg-(--surface) text-(--text) font-[Nunito] text-base shadow-lg whitespace-nowrap"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <span>📴 Du är offline</span>
      <button
        type="button"
        class="min-w-11 min-h-11 flex items-center justify-center rounded-full text-(--text-muted) text-lg cursor-pointer touch-manipulation"
        onClick={() => setDismissed(true)}
        aria-label="Stäng"
      >
        ✕
      </button>
    </div>
  )
}
