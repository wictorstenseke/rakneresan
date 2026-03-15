import { usePullToRefresh } from '../hooks/usePullToRefresh'

export function PullToRefresh() {
  const { phase, pullDistance } = usePullToRefresh()

  if (phase === 'idle') return null

  const translateY = phase === 'refreshing' ? 20 : Math.max(0, pullDistance - 20)

  return (
    <div
      class="ptr-indicator"
      style={{ transform: `translateX(-50%) translateY(${translateY}px)` }}
    >
      <div class={`ptr-spinner${phase === 'refreshing' ? ' spinning' : ''}`} />
    </div>
  )
}
