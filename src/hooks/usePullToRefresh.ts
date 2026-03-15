import { useState, useEffect, useRef } from 'preact/hooks'

const THRESHOLD = 80
const SHOW_THRESHOLD = 40
const REFRESH_DURATION = 1200

export type Phase = 'idle' | 'pulling' | 'refreshing'

export function usePullToRefresh() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [pullDistance, setPullDistance] = useState(0)
  const stateRef = useRef({ startY: 0, isPulling: false, isRefreshing: false })

  useEffect(() => {
    const el = document.getElementById('app')
    if (!el) return

    const handleTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0 && !stateRef.current.isRefreshing) {
        stateRef.current.startY = e.touches[0].clientY
        stateRef.current.isPulling = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!stateRef.current.isPulling) return
      const delta = e.touches[0].clientY - stateRef.current.startY
      if (delta > 0) {
        const dist = Math.min(delta * 0.5, THRESHOLD + 20)
        setPullDistance(dist)
        setPhase('pulling')
      } else {
        setPullDistance(0)
        setPhase('idle')
      }
    }

    const handleTouchEnd = () => {
      if (!stateRef.current.isPulling) return
      stateRef.current.isPulling = false

      setPullDistance(prev => {
        if (prev >= THRESHOLD) {
          stateRef.current.isRefreshing = true
          setPhase('refreshing')
          navigator.serviceWorker?.ready.then(reg => reg.update()).catch(() => {})
          setTimeout(() => {
            setPhase('idle')
            stateRef.current.isRefreshing = false
          }, REFRESH_DURATION)
        } else {
          setPhase('idle')
        }
        return 0
      })
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const pullProgress = phase === 'pulling'
    ? Math.min(1, Math.max(0, (pullDistance - SHOW_THRESHOLD) / (THRESHOLD - SHOW_THRESHOLD)))
    : phase === 'refreshing' ? 1 : 0

  return { phase, pullDistance, pullProgress, showThreshold: SHOW_THRESHOLD }
}
