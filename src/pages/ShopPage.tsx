import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { BalanceChip } from '../components/BalanceChip'
import { TopHeader } from '../components/TopHeader'
import { UserMenuChip } from '../components/UserMenuChip'
import { storage } from '../lib/storageContext'
import { REWARD_VIDEO_IDS, buildEmbedUrl, fetchVideoTitle } from '../lib/youtube'

interface ShopPageProps {
  user: string
  onBack: () => void
  onStats: () => void
  onLogout: () => void
  onSuperuser?: () => void
}

const VIDEO_COST = 5
const PEEK_SAVER_COST = 3

interface ShopItem {
  id: string
  type: 'video' | 'peekSaver'
  label: string
  description: string
  emoji: string
  cost: number
}

const PEEK_SAVER_ITEM: ShopItem = {
  id: 'peekSaver',
  type: 'peekSaver',
  label: 'Kika gratis',
  description: 'Titta på svaret utan att kort hamnar i Öva igen',
  emoji: '👀',
  cost: PEEK_SAVER_COST,
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          events?: {
            onStateChange?: (event: { data: number }) => void
          }
        }
      ) => { destroy(): void }
    }
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

function loadYouTubeApi(onReady: () => void) {
  if (window.YT && window.YT.Player) {
    onReady()
    return
  }
  const prev = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    if (prev) prev()
    onReady()
  }
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  }
}

export function ShopPage({ user, onBack, onStats, onLogout, onSuperuser }: ShopPageProps) {
  const [credits, setCredits] = useState(0)
  const [peekSavers, setPeekSavers] = useState(0)
  const [purchaseCounts, setPurchaseCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [videoIds, setVideoIds] = useState<string[]>([])

  // Confirmation modal
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null)

  // Video playback
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Video titles fetched from YouTube oEmbed
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({})

  // Label shown in the confirmation modal (resolved at click time)
  const [confirmLabel, setConfirmLabel] = useState<string>('')

  // Feedback
  const [feedback, setFeedback] = useState<{ text: string; good: boolean } | null>(null)

  // Peek Saver purchase animation: flying +1 from Köp button to badge
  const [rewardFly, setRewardFly] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null)
  const [peekSaverRewardKey, setPeekSaverRewardKey] = useState(0)
  const peekSaverBuyRectRef = useRef<DOMRect | null>(null)
  const saversChipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    storage.getUser(user).then(userData => {
      if (userData) {
        if (!(userData.creditsEnabled ?? true)) {
          onBack()
          return
        }
        setCredits(userData.credits ?? 0)
        setPeekSavers(userData.peekSavers ?? 0)
        setPurchaseCounts(userData.purchaseCounts ?? {})
        const spaceVideos = userData.spaceVideos ?? {}
        const hidden = new Set(userData.hiddenVideos ?? [])
        const configured = [...new Set(Object.values(spaceVideos).flat())]
        const pool = configured.length > 0 ? configured : REWARD_VIDEO_IDS
        setVideoIds(pool.filter(id => !hidden.has(id)))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user, onBack])

  useEffect(() => {
    let cancelled = false
    videoIds.forEach(id => {
      fetchVideoTitle(id).then(title => {
        if (!cancelled && title) {
          setVideoTitles(prev => ({ ...prev, [id]: title }))
        }
      })
    })
    return () => { cancelled = true }
  }, [videoIds])

  const showFeedback = useCallback((text: string, good: boolean) => {
    setFeedback({ text, good })
    setTimeout(() => setFeedback(null), 2500)
  }, [])

  const handleBuyClick = useCallback((item: ShopItem, label: string, e?: MouseEvent) => {
    if (credits < item.cost) {
      showFeedback('Inte nog med poäng!', false)
      return
    }
    if (item.type === 'peekSaver' && e?.currentTarget instanceof HTMLElement) {
      peekSaverBuyRectRef.current = e.currentTarget.getBoundingClientRect()
    } else {
      peekSaverBuyRectRef.current = null
    }
    setConfirmLabel(label)
    setConfirmItem(item)
  }, [credits, showFeedback])

  const handleConfirm = useCallback(async () => {
    if (!confirmItem) return
    const item = confirmItem
    const isPeekSaver = item.type === 'peekSaver'

    // Use Köp button position (captured when user clicked it) for flying +1
    const fromRect = isPeekSaver ? peekSaverBuyRectRef.current : null
    peekSaverBuyRectRef.current = null

    setConfirmItem(null)

    const success = await storage.spendCreditsAndTrackPurchase(user, item.cost, item.id)
    if (!success) {
      showFeedback('Köpet misslyckades – försök igen', false)
      return
    }

    // Update local state
    setCredits(prev => prev - item.cost)
    setPurchaseCounts(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))

    if (isPeekSaver) {
      await storage.addPeekSavers(user, 1)
      setPeekSavers(prev => prev + 1)

      // Trigger flying +1 and badge bounce
      const toRect = saversChipRef.current?.getBoundingClientRect()
      if (fromRect && toRect) {
        setRewardFly({
          fromX: fromRect.left + fromRect.width / 2,
          fromY: fromRect.top + fromRect.height / 2,
          toX: toRect.left + toRect.width / 2,
          toY: toRect.top + toRect.height / 2,
        })
      }
      setPeekSaverRewardKey(k => k + 1)
      setTimeout(() => setRewardFly(null), 1000)
    } else if (item.type === 'video') {
      setVideoEnded(false)
      setIsExpanded(false)
      setPlayingVideoId(item.id)
    }
  }, [confirmItem, user, showFeedback])

  const handleCancelConfirm = useCallback(() => {
    setConfirmItem(null)
  }, [])

  // YouTube player for shop video
  useEffect(() => {
    if (!playingVideoId) return
    let player: { destroy(): void } | null = null

    loadYouTubeApi(() => {
      player = new window.YT.Player('yt-shop-player', {
        events: {
          onStateChange: (event: { data: number }) => {
            if (event.data === 0) setVideoEnded(true)
          },
        },
      })
    })

    return () => {
      player?.destroy()
    }
  }, [playingVideoId])

  if (playingVideoId) {
    return (
      <div class="screen active video-reward-screen">
        <div class={`yt-iframe-wrap${isExpanded ? ' yt-iframe-wrap--expanded' : ''}`}>
          <iframe
            id="yt-shop-player"
            src={buildEmbedUrl(playingVideoId)}
            title="Köpt video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            frameBorder="0"
            class="yt-iframe"
          />
          {videoEnded && (
            <div class="yt-ended-overlay">
              <span class="yt-ended-emoji">🎬</span>
              <p class="yt-ended-msg">Video klart!</p>
            </div>
          )}
        </div>
        <div class="video-action-btns">
          <button
            class="video-back-btn-outline"
            onClick={() => setIsExpanded(v => !v)}
            aria-label={isExpanded ? 'Zooma ut' : 'Zooma in'}
          >
            {isExpanded ? '⊖ Zooma ut' : '⊕ Zooma in'}
          </button>
          <button class="video-back-btn-outline" onClick={() => setPlayingVideoId(null)}>
            Tillbaka till affären
          </button>
        </div>
      </div>
    )
  }

  return (
    <div class="screen active shop-screen">
      {/* Confirmation modal */}
      {confirmItem && (
        <div class="hint-backdrop" role="dialog" aria-modal="true" aria-label="Bekräfta köp" onClick={handleCancelConfirm}>
          <div class="hint-modal shop-confirm-modal" onClick={e => e.stopPropagation()}>
            <div class="hint-modal-header">
              <span class="hint-modal-title">Bekräfta köp</span>
              <button type="button" class="hint-close-btn" onClick={handleCancelConfirm} aria-label="Stäng">✕</button>
            </div>
            <div class="shop-confirm-body">
              <div class="shop-confirm-item-icon">{confirmItem.emoji}</div>
              <p class="shop-confirm-item-name">{confirmLabel}</p>
              <p class="shop-confirm-cost">Kostar <strong>{confirmItem.cost} poäng</strong></p>
              {confirmItem.type === 'video' && (
                <p class="shop-confirm-hint">Videon öppnas direkt efter köpet.</p>
              )}
              <div class="shop-confirm-actions">
                <button class="btn-secondary" onClick={handleCancelConfirm}>Avbryt</button>
                <button class="btn-primary" onClick={handleConfirm}>Köp nu!</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TopHeader showBack onBack={onBack} maxWidth="900px">
        <UserMenuChip user={user} onHome={onBack} onStats={onStats} onShop={() => {}} onLogout={onLogout} variant="shop" onSuperuser={onSuperuser} />
      </TopHeader>

      <h1 class="page-title w-full max-w-[900px] mx-auto">🛍️ Affär</h1>

      {feedback && (
        <div class={`shop-feedback${feedback.good ? ' shop-feedback-good' : ' shop-feedback-bad'}`}>
          {feedback.text}
        </div>
      )}

      {rewardFly && (
        <div
          class="reward-fly-badge"
          style={{
            '--from-x': `${rewardFly.fromX}px`,
            '--from-y': `${rewardFly.fromY}px`,
            '--to-x': `${rewardFly.toX}px`,
            '--to-y': `${rewardFly.toY}px`,
          } as Record<string, string>}
          aria-hidden="true"
        >
          +1
        </div>
      )}

      {loading ? (
        <div class="shop-loading">Laddar affären...</div>
      ) : (
        <div class="shop-content">
          <div class="flex flex-col sm:flex-row sm:items-stretch sm:justify-between gap-2 mb-5">
            <div class="flex items-center min-h-9 justify-start">
              <p class="shop-intro m-0 text-left">Spendera dina poäng på roliga belöningar!</p>
            </div>
            <div class="shop-balances flex flex-wrap items-center justify-end gap-2.5 shrink-0">
              <BalanceChip type="credits" count={credits} />
              <div ref={saversChipRef}>
                <BalanceChip type="savers" count={peekSavers} rewardBounceTrigger={peekSaverRewardKey} />
              </div>
            </div>
          </div>

          <div class="shop-grid">
            {[PEEK_SAVER_ITEM, ...videoIds.map((id, idx): ShopItem => ({
              id,
              type: 'video',
              label: `Belöningsvideo ${idx + 1}`,
              description: 'Se en rolig YouTube-video som belöning!',
              emoji: '🎬',
              cost: VIDEO_COST,
            }))].map(item => {
              const count = purchaseCounts[item.id] ?? 0
              const canAfford = credits >= item.cost
              const displayLabel =
                item.type === 'video' ? (videoTitles[item.id] ?? item.label) : item.label
              return (
                <div
                  key={item.id}
                  class={`shop-item${!canAfford ? ' shop-item-locked' : ''}${canAfford ? ' shop-item-clickable' : ''}`}
                  role={canAfford ? 'button' : undefined}
                  tabIndex={canAfford ? 0 : undefined}
                  aria-label={canAfford ? `Köp ${displayLabel} för ${item.cost} poäng` : undefined}
                  onClick={canAfford ? (e) => handleBuyClick(item, displayLabel, e as unknown as MouseEvent) : undefined}
                  onKeyDown={canAfford ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBuyClick(item, displayLabel); } } : undefined}
                >
                  <div class="shop-item-icon">{item.emoji}</div>
                  <div class="shop-item-info">
                    <div class="shop-item-name">{displayLabel}</div>
                    <div class="shop-item-desc">{item.description}</div>
                    {count > 0 && (
                      <div class="shop-item-count">Köpt {count}×</div>
                    )}
                  </div>
                  <div class={`shop-buy-btn${canAfford ? '' : ' shop-buy-btn-disabled'}`}>
                    <span class="shop-buy-cost">💰 {item.cost}</span>
                    <span class="shop-buy-label">Köp</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ShopPage
