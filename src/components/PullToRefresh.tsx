import { usePullToRefresh } from '../hooks/usePullToRefresh'

const CIRCUMFERENCE = 2 * Math.PI * 14 // r=14 → ≈87.96

export function PullToRefresh() {
  const { phase, pullDistance, pullProgress, showThreshold } = usePullToRefresh()

  if (pullProgress <= 0 && phase !== 'refreshing') return null

  const translateY = phase === 'refreshing' ? 34 : Math.max(0, pullDistance - showThreshold - 10)
  const isSpinning = phase === 'refreshing'

  // Wind-up rotation: arc starts at top (-90°) and rotates 180° as progress goes 0→1
  const windRotation = -90 + pullProgress * 180
  const dashOffset = CIRCUMFERENCE * (1 - pullProgress)

  return (
    <div
      class="ptr-indicator"
      style={{ transform: `translateX(-50%) translateY(${translateY}px)`, opacity: Math.min(1, pullProgress * 2) }}
    >
      <svg
        class={`ptr-arc${isSpinning ? ' spinning' : ''}`}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background track ring */}
        <circle
          cx="20" cy="20" r="14"
          fill="none"
          stroke="var(--surface)"
          strokeWidth="3"
          opacity="0.5"
        />
        {/* Progress arc */}
        <g style={{ transform: `rotate(${isSpinning ? 0 : windRotation}deg)`, transformOrigin: '20px 20px' }}>
          <circle
            cx="20" cy="20" r="14"
            fill="none"
            stroke="var(--tc)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={isSpinning ? 0 : dashOffset}
          />
        </g>
      </svg>
    </div>
  )
}
