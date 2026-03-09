import { useEffect, useRef, useState } from 'preact/hooks'
import type { RoundResult } from '../hooks/useGame'
import { getCategoryDef } from '../lib/constants'
import { buildEmbedUrl, pickRandomVideoId } from '../lib/youtube'

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

interface CompletePageProps {
  result: RoundResult
  onContinue: () => void
  onBack: () => void
}

const CONFETTI_EMOJIS = ['🎉', '⭐', '🌟', '✨', '🎊', '💫', '🏅', '🥳']
const CONFETTI_COUNT = 30

function spawnConfetti(container: HTMLElement) {
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const el = document.createElement('div')
    el.className = 'confetti-piece'
    el.textContent = CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)]
    el.style.left = `${Math.random() * 100}%`
    el.style.animationDelay = `${Math.random() * 1.5}s`
    el.style.animationDuration = `${2 + Math.random() * 2}s`
    el.style.fontSize = `${1 + Math.random() * 1.5}rem`
    container.appendChild(el)
    setTimeout(() => el.remove(), 4500)
  }
}

function getReaction(allClear: boolean, clearCount: number, retryCount: number): { emoji: string; heading: string; message: string } {
  if (allClear) {
    const perfects = [
      { emoji: '🏆', heading: 'Alla klara!', message: 'Fantastiskt! Du är en matte-mästare!' },
      { emoji: '🌟', heading: 'Perfekt!', message: 'Wow, du slog alla kort! Strålande!' },
      { emoji: '🥇', heading: 'Guldmedalj!', message: 'Alla rätt – vilken prestation!' },
      { emoji: '🎯', heading: 'Pricksäkert!', message: 'Inte ett enda fel – imponerande!' },
    ]
    return perfects[Math.floor(Math.random() * perfects.length)]
  }

  if (retryCount === 0) {
    return { emoji: '🎉', heading: 'Snyggt jobbat!', message: 'Alla rätt den här rundan! Fortsätt så!' }
  }

  const ratio = clearCount / (clearCount + retryCount)
  if (ratio >= 0.7) {
    const good = [
      { emoji: '💪', heading: 'Bra jobbat!', message: 'Nästan alla rätt – du är på god väg!' },
      { emoji: '🚀', heading: 'Bra fart!', message: 'Du lär dig snabbt, fortsätt öva!' },
    ]
    return good[Math.floor(Math.random() * good.length)]
  }

  const encourage = [
    { emoji: '📚', heading: 'Fortsätt öva!', message: 'Varje övning gör dig bättre!' },
    { emoji: '🌱', heading: 'Du växer!', message: 'Övning ger färdighet – snart kan du alla!' },
    { emoji: '💡', heading: 'Bra försök!', message: 'Lite till så sitter det! Du klarar det!' },
  ]
  return encourage[Math.floor(Math.random() * encourage.length)]
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

export function CompletePage({ result, onContinue, onBack }: CompletePageProps) {
  const { clearCount, retryCount, allClear, categoryId, wins } = result
  const categoryLabel = getCategoryDef(categoryId)?.label ?? `${categoryId}:ans tabell`
  const confettiRef = useRef<HTMLDivElement>(null)
  const reaction = getReaction(allClear, clearCount, retryCount)

  const [showVideo, setShowVideo] = useState(false)
  const [videoId] = useState(() => pickRandomVideoId())
  const [videoEnded, setVideoEnded] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (confettiRef.current && (allClear || retryCount === 0)) {
      spawnConfetti(confettiRef.current)
    }
  }, [allClear, retryCount])

  useEffect(() => {
    if (!showVideo) return
    let player: { destroy(): void } | null = null

    loadYouTubeApi(() => {
      player = new window.YT.Player('yt-reward-player', {
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
  }, [showVideo])

  if (showVideo) {
    return (
      <div class="screen active video-reward-screen">
        <div class="video-reward-wrap">
          <div class={`yt-iframe-wrap${isExpanded ? ' yt-iframe-wrap--expanded' : ''}`}>
            <iframe
              id="yt-reward-player"
              src={buildEmbedUrl(videoId)}
              title="Belöningsvideo"
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
            <button
              class="yt-expand-btn"
              onClick={() => setIsExpanded(v => !v)}
              aria-label={isExpanded ? 'Minimera video' : 'Förstora video'}
            >
              {isExpanded ? '✕' : '⛶'}
            </button>
          </div>
          <button class="video-back-btn video-back-btn-outline" onClick={onBack}>
            Tillbaka
          </button>
        </div>
      </div>
    )
  }

  return (
    <div class="screen active complete-screen">
      <div class="confetti-container" ref={confettiRef} />
      <div class="complete-box">
        <span class="complete-emoji">{reaction.emoji}</span>
        <h2>{reaction.heading}</h2>
        <p>{reaction.message}</p>

        {allClear && wins > 0 && (
          <div class="streak-badge">
            🔥 {wins} {wins === 1 ? 'vinst' : 'vinster'} på {categoryLabel}!
          </div>
        )}

        <div class="complete-stats">
          <div class="cstat c">
            <div class="cstat-num">{clearCount}</div>
            <div class="cstat-label">Klara</div>
          </div>
          <div class="cstat r">
            <div class="cstat-num">{retryCount}</div>
            <div class="cstat-label">Öva igen</div>
          </div>
        </div>

        <div class="complete-btns">
          <button class="btn-primary" onClick={onContinue}>
            {allClear ? 'Spela igen! 🎮' : 'Fortsätt öva! 📚'}
          </button>
          {allClear && categoryId !== 1 && categoryId !== 10 && (
            <button class="btn-video-reward" onClick={() => setShowVideo(true)}>
              Se en belöningsvideo! 🎬
            </button>
          )}
          <button class="btn-secondary" onClick={onBack}>
            Tillbaka
          </button>
        </div>
      </div>
    </div>
  )
}
