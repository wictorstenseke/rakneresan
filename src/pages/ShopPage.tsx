import { useCallback, useEffect, useState } from 'preact/hooks'
import { ThemeToggle } from '../components/ThemeToggle'
import { storage } from '../lib/storageContext'
import { REWARD_VIDEO_IDS, buildEmbedUrl } from '../lib/youtube'

interface ShopPageProps {
  user: string
  onBack: () => void
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
  label: 'Peek Saver',
  description: 'Titta på svaret utan att kort hamnar i Öva igen',
  emoji: '🛡️',
  cost: PEEK_SAVER_COST,
}

const VIDEO_ITEMS: ShopItem[] = REWARD_VIDEO_IDS.map((id, idx) => ({
  id,
  type: 'video',
  label: `Belöningsvideo ${idx + 1}`,
  description: 'Se en rolig YouTube-video som belöning!',
  emoji: '🎬',
  cost: VIDEO_COST,
}))

const ALL_ITEMS: ShopItem[] = [PEEK_SAVER_ITEM, ...VIDEO_ITEMS]

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

export function ShopPage({ user, onBack }: ShopPageProps) {
  const [credits, setCredits] = useState(0)
  const [peekSavers, setPeekSavers] = useState(0)
  const [purchaseCounts, setPurchaseCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Confirmation modal
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null)

  // Video playback
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Feedback
  const [feedback, setFeedback] = useState<{ text: string; good: boolean } | null>(null)

  useEffect(() => {
    storage.getUser(user).then(userData => {
      if (userData) {
        setCredits(userData.credits ?? 0)
        setPeekSavers(userData.peekSavers ?? 0)
        setPurchaseCounts(userData.purchaseCounts ?? {})
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const showFeedback = useCallback((text: string, good: boolean) => {
    setFeedback({ text, good })
    setTimeout(() => setFeedback(null), 2500)
  }, [])

  const handleBuyClick = useCallback((item: ShopItem) => {
    if (credits < item.cost) {
      showFeedback('Inte nog med poäng!', false)
      return
    }
    setConfirmItem(item)
  }, [credits, showFeedback])

  const handleConfirm = useCallback(async () => {
    if (!confirmItem) return
    const item = confirmItem
    setConfirmItem(null)

    const success = await storage.spendCreditsAndTrackPurchase(user, item.cost, item.id)
    if (!success) {
      showFeedback('Köpet misslyckades – försök igen', false)
      return
    }

    // Update local state
    setCredits(prev => prev - item.cost)
    setPurchaseCounts(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))

    if (item.type === 'peekSaver') {
      // Add peek saver to balance
      await storage.addPeekSavers(user, 1)
      setPeekSavers(prev => prev + 1)
      showFeedback('🛡️ Peek Saver tillagd!', true)
    } else if (item.type === 'video') {
      // Open the video
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
            Tillbaka till butiken
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
              <p class="shop-confirm-item-name">{confirmItem.label}</p>
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

      <div class="shop-header">
        <button type="button" class="back-chip" onClick={onBack} aria-label="Tillbaka">Tillbaka</button>
        <div class="shop-title">🛍️ Butiken</div>
        <div class="shop-balances">
          <span class="balance-chip balance-credits">💰 {credits}</span>
          <span class="balance-chip balance-savers">🛡️ {peekSavers}</span>
        </div>
        <ThemeToggle />
      </div>

      {feedback && (
        <div class={`shop-feedback${feedback.good ? ' shop-feedback-good' : ' shop-feedback-bad'}`}>
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div class="shop-loading">Laddar butiken...</div>
      ) : (
        <div class="shop-content">
          <p class="shop-intro">Spendera dina poäng på roliga belöningar!</p>

          <div class="shop-grid">
            {ALL_ITEMS.map(item => {
              const count = purchaseCounts[item.id] ?? 0
              const canAfford = credits >= item.cost
              return (
                <div key={item.id} class={`shop-item${!canAfford ? ' shop-item-locked' : ''}`}>
                  <div class="shop-item-icon">{item.emoji}</div>
                  <div class="shop-item-info">
                    <div class="shop-item-name">{item.label}</div>
                    <div class="shop-item-desc">{item.description}</div>
                    {count > 0 && (
                      <div class="shop-item-count">Köpt {count}×</div>
                    )}
                  </div>
                  <button
                    class={`shop-buy-btn${canAfford ? '' : ' shop-buy-btn-disabled'}`}
                    onClick={() => handleBuyClick(item)}
                    disabled={!canAfford}
                    aria-label={`Köp ${item.label} för ${item.cost} poäng`}
                  >
                    <span class="shop-buy-cost">💰 {item.cost}</span>
                    <span class="shop-buy-label">Köp</span>
                  </button>
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
