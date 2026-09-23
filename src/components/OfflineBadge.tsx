import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function OfflineBadge() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="status"
      class="fixed left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-(--surface) text-(--text) font-[Nunito] text-[0.75rem] opacity-90 shadow-md pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top) + 4px)' }}
    >
      📴 Offline – sparas när du är online igen
    </div>
  )
}
