import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { RoundResult } from '../hooks/useGame'
import { ThemeToggle } from '../components/ThemeToggle'
import { getCategoryDef } from '../lib/constants'
import { storage } from '../lib/storageContext'

interface CompletePageProps {
  result: RoundResult
  user: string
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

export function CompletePage({ result, user, onContinue, onBack }: CompletePageProps) {
  const { clearCount, retryCount, allClear, categoryId, wins } = result
  const categoryLabel = getCategoryDef(categoryId)?.label ?? `${categoryId}:ans tabell`
  const confettiRef = useRef<HTMLDivElement>(null)
  const [reaction] = useState(() => getReaction(allClear, clearCount, retryCount))

  // Reward choice state
  const [rewardChosen, setRewardChosen] = useState(false)
  const [rewardFeedback, setRewardFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (confettiRef.current && (allClear || retryCount === 0)) {
      spawnConfetti(confettiRef.current)
    }
  }, [allClear, retryCount])

  const handleChooseCredits = useCallback(() => {
    if (rewardChosen) return
    setRewardChosen(true)
    storage.addCredits(user, 1)
      .then(() => setRewardFeedback('💰 +1 poäng tillagd!'))
      .catch(() => setRewardFeedback('💰 +1 poäng!'))
  }, [rewardChosen, user])

  const handleChoosePeekSaver = useCallback(() => {
    if (rewardChosen) return
    setRewardChosen(true)
    storage.addPeekSavers(user, 1)
      .then(() => setRewardFeedback('🛡️ +1 Peek Saver tillagd!'))
      .catch(() => setRewardFeedback('🛡️ +1 Peek Saver!'))
  }, [rewardChosen, user])

  const handleContinue = useCallback(() => {
    if (!rewardChosen) storage.addCredits(user, 1)
    onContinue()
  }, [rewardChosen, user, onContinue])

  const handleBack = useCallback(() => {
    if (!rewardChosen) storage.addCredits(user, 1)
    onBack()
  }, [rewardChosen, user, onBack])

  return (
    <div class="screen active complete-screen">
      <div class="mb-3 flex justify-end w-full max-w-[420px]">
        <ThemeToggle />
      </div>
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

        {/* Reward choice */}
        <div class="reward-choice-section">
          {rewardFeedback ? (
            <div class="reward-feedback">{rewardFeedback}</div>
          ) : (
            <>
              <p class="reward-choice-label">Välj din belöning:</p>
              <div class="reward-choice-btns">
                <button
                  class="btn-reward-choice btn-reward-credits"
                  onClick={handleChooseCredits}
                >
                  <span class="reward-choice-icon">💰</span>
                  <span class="reward-choice-text">+1 Poäng</span>
                </button>
                <button
                  class="btn-reward-choice btn-reward-saver"
                  onClick={handleChoosePeekSaver}
                >
                  <span class="reward-choice-icon">🛡️</span>
                  <span class="reward-choice-text">+1 Peek Saver</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div class="flex flex-col gap-2.5 mt-4">
          <button class="stats-chip w-full" onClick={handleContinue}>
            {allClear ? 'Spela igen! 🎮' : 'Fortsätt öva! 📚'}
          </button>
          <button class="back-chip w-full" onClick={handleBack}>
            Tillbaka
          </button>
        </div>
      </div>
    </div>
  )
}

export default CompletePage
