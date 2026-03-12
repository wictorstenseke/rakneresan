import { useState, useRef, useEffect } from 'preact/hooks'

interface BalanceChipProps {
  type: 'credits' | 'savers'
  count: number
  onShopClick?: () => void
  rewardBounceTrigger?: number
}

const DESCRIPTIONS = {
  credits: { before: 'Poäng som du tjänar genom att klara kort. Använd dem för att köpa belöningar i ', link: 'butiken', after: '.' },
  savers: { before: 'Titta på svaret utan att kort hamnar i Öva igen-pilen. Köp fler i ', link: 'butiken', after: '.' },
} as const

const ALIGN_LEFT_THRESHOLD = 250

export function BalanceChip({ type, count, onShopClick, rewardBounceTrigger }: BalanceChipProps) {
  const [open, setOpen] = useState(false)
  const [alignLeft, setAlignLeft] = useState(false)
  const [isBouncing, setIsBouncing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevTriggerRef = useRef(rewardBounceTrigger ?? 0)

  useEffect(() => {
    const trigger = rewardBounceTrigger ?? 0
    if (trigger > prevTriggerRef.current) {
      prevTriggerRef.current = trigger
      setIsBouncing(true)
      const t = setTimeout(() => setIsBouncing(false), 1000)
      return () => clearTimeout(t)
    }
  }, [rewardBounceTrigger])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  useEffect(() => {
    if (!open || !containerRef.current) return
    const raf = requestAnimationFrame(() => {
      const rect = containerRef.current!.getBoundingClientRect()
      setAlignLeft(rect.right < ALIGN_LEFT_THRESHOLD)
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  const isCredits = type === 'credits'
  const title = isCredits ? 'Dina poäng' : 'Dina Peek Savers'
  const label = isCredits ? '💰' : '👀'

  return (
    <div class="balance-chip-wrapper" ref={containerRef}>
      <button
        type="button"
        class={`balance-chip ${isCredits ? 'balance-credits' : 'balance-savers'}${isBouncing ? ' balance-chip-reward-bounce' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={title}
      >
        {label} {count}
        {isBouncing && <span class="balance-chip-plus-one">+1</span>}
      </button>
      {open && (
        <div
          class={`balance-chip-popover${alignLeft ? ' balance-chip-popover--align-left' : ''}`}
          role="tooltip"
        >
          <p class="balance-chip-popover-text">
            {DESCRIPTIONS[type].before}
            {onShopClick ? (
              <button type="button" class="balance-chip-link" onClick={() => { setOpen(false); onShopClick() }}>
                {DESCRIPTIONS[type].link}
              </button>
            ) : (
              DESCRIPTIONS[type].link
            )}
            {DESCRIPTIONS[type].after}
          </p>
        </div>
      )}
    </div>
  )
}
