import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import { ThemeToggle } from '../components/ThemeToggle'
import { getCategoryDef } from '../lib/constants'
import { useGame } from '../hooks/useGame'
import { NumericKeypad } from '../components/NumericKeypad'
import { HintModal } from '../components/HintModal'
import type { RoundResult } from '../hooks/useGame'
import { storage } from '../lib/storageContext'

interface GamePageProps {
  categoryId: number
  user: string
  onBack: () => void
  onComplete: (result: RoundResult) => void
}

const SHOW_ANSWER_DURATION_MS = 12000

export function GamePage({ categoryId, user, onBack, onComplete }: GamePageProps) {
  const { gameState, roundResult, startGame, submitAnswer, peekCard, moveToRetry, saveProgress } = useGame(user)
  const [inputValue, setInputValue] = useState('')
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [flipped, setFlipped] = useState(false)
  const [shaking, setShaking] = useState(false)
  const wrongAttemptsRef = useRef(0)
  const [showAnswerAfterWrong, setShowAnswerAfterWrong] = useState(false)
  const [cardKey, setCardKey] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const startedRef = useRef(false)
  const showAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [peekSavers, setPeekSavers] = useState(0)

  const catDef = getCategoryDef(categoryId)

  // Start game on mount and load saver balance
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true

      const color = catDef?.color ?? '#4D96FF'
      const color2 = catDef?.color2 ?? '#6BCB77'
      document.documentElement.style.setProperty('--tc', color)
      document.documentElement.style.setProperty('--tc2', color2)

      void startGame(categoryId)
    }
  }, [categoryId, catDef, startGame])

  useEffect(() => {
    storage.getUser(user).then(userData => {
      if (userData) setPeekSavers(userData.peekSavers ?? 0)
    }).catch(() => {})
  }, [user])

  // Handle round completion
  useEffect(() => {
    if (roundResult) {
      onComplete(roundResult)
    }
  }, [roundResult, onComplete])

  // Track card changes to reset input state
  const prevCardRef = useRef<{ n: number; deckLen: number } | null>(null)
  useEffect(() => {
    const curr = gameState.current
    const prev = prevCardRef.current
    if (curr && (!prev || prev.n !== curr.n || prev.deckLen !== gameState.deck.length)) {
      prevCardRef.current = { n: curr.n, deckLen: gameState.deck.length }
      setInputValue('')
      setAnswerState('idle')
      setFlipped(false)
      setShaking(false)
      wrongAttemptsRef.current = 0
      setShowAnswerAfterWrong(false)
      setCardKey(k => k + 1)
      if (showAnswerTimerRef.current) {
        clearTimeout(showAnswerTimerRef.current)
        showAnswerTimerRef.current = null
      }
    }
  }, [gameState.current, gameState.deck.length])

  const handleBack = useCallback(() => {
    void saveProgress().then(() => onBack())
  }, [saveProgress, onBack])

  const floatFeedback = useCallback((text: string, good: boolean) => {
    const el = document.createElement('div')
    el.className = 'float-feedback'
    el.textContent = text
    el.style.color = good ? '#2D9B4A' : '#E06B1F'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 900)
  }, [])

  const handleSubmit = useCallback(() => {
    if (flipped) return

    const val = parseInt(inputValue)
    if (isNaN(val) || inputValue === '') return

    const result = submitAnswer(val)
    if (result === 'correct') {
      setAnswerState('correct')
      floatFeedback('🎉 Rätt!', true)
      setFlipped(true)
    } else if (result === 'wrong') {
      wrongAttemptsRef.current += 1
      const attempts = wrongAttemptsRef.current
      setAnswerState('wrong')
      setShaking(true)
      setInputValue('')
      floatFeedback('✗', false)
      setTimeout(() => {
        setShaking(false)
        if (attempts < 2) {
          setAnswerState('idle')
        } else {
          setFlipped(true)
          setShowAnswerAfterWrong(true)
        }
      }, 600)
    }
  }, [inputValue, flipped, submitAnswer, floatFeedback])

  const handleShowAnswerDismiss = useCallback(() => {
    if (!showAnswerAfterWrong) return
    if (showAnswerTimerRef.current) {
      clearTimeout(showAnswerTimerRef.current)
      showAnswerTimerRef.current = null
    }
    moveToRetry()
  }, [showAnswerAfterWrong, moveToRetry])

  useEffect(() => {
    if (!showAnswerAfterWrong) return
    showAnswerTimerRef.current = setTimeout(handleShowAnswerDismiss, SHOW_ANSWER_DURATION_MS)
    return () => {
      if (showAnswerTimerRef.current) {
        clearTimeout(showAnswerTimerRef.current)
        showAnswerTimerRef.current = null
      }
    }
  }, [showAnswerAfterWrong, handleShowAnswerDismiss])

  const handlePeek = useCallback(() => {
    if (flipped) return
    setFlipped(true)

    if (peekSavers > 0) {
      // Optimistically decrement local count
      setPeekSavers(prev => prev - 1)
      // Fire-and-forget saver consumption
      storage.consumePeekSaver(user).catch(() => {
        // Restore on failure
        setPeekSavers(prev => prev + 1)
      })
      peekCard(true)
      floatFeedback('🛡️ Saver använd!', true)
    } else {
      peekCard(false)
      floatFeedback('👀 Till öva igen', false)
    }
  }, [flipped, peekSavers, user, peekCard, floatFeedback])

  const handleHint = useCallback(() => {
    setShowHint(true)
  }, [])

  // Keyboard support: numbers, Delete/Backspace, Enter
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (showAnswerAfterWrong) {
          handleShowAnswerDismiss()
        } else if (!flipped) {
          handleSubmit()
        }
        return
      }
      const disabled = flipped || showAnswerAfterWrong
      if (disabled) return
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        setInputValue(prev => (prev.length < 3 ? prev + e.key : prev))
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        setInputValue(prev => prev.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flipped, showAnswerAfterWrong, handleSubmit, handleShowAnswerDismiss])

  const { deck, clearPile, retryPile, current, operation, question, answer, backLabel } = gameState
  const done = clearPile.length + retryPile.length
  const total = deck.length + done
  const tableColor = catDef?.color ?? '#4D96FF'

  if (!current) {
    return <div class="screen active game-screen" />
  }

  const answerDisplayClass = `answer-display${answerState !== 'idle' ? ` ${answerState}` : ''}`

  return (
    <div class="screen active game-screen">
      <HintModal
        categoryId={categoryId}
        operation={operation}
        isOpen={showHint}
        onClose={() => setShowHint(false)}
        tableColor={tableColor}
        equations={Array.from(gameState.equations.values())}
      />
      <div class="game-header w-full max-w-[480px] flex items-center mb-5 flex-wrap gap-3 md:gap-4 max-sm:mb-2.5">
        <button type="button" class="back-chip" onClick={handleBack} aria-label="Tillbaka">Tillbaka</button>
        <div class="game-title font-[Fredoka_One] text-2xl max-sm:text-xl text-(--text) flex-1">{catDef?.label ?? `Kategori ${categoryId}`}</div>
        <div class="font-extrabold text-[.85rem] text-(--text-muted)">{done}/{total}</div>
        <ThemeToggle />
      </div>

      <div class="game-content flex-1 flex items-center justify-center w-full pb-4 max-sm:pb-2">
        <div class="game-layout flex flex-col items-center gap-4 w-full max-w-[480px] max-sm:gap-2.5">
          <div class="flex flex-col items-center w-full">
            <div class="piles-bar">
              <div class="pile-box deck-pile">
                <div class="pile-count">{deck.length}</div>
                <div class="pile-label">Kort kvar</div>
              </div>
              <div class="pile-box clear-pile">
                <div class="pile-count">{clearPile.length}</div>
                <div class="pile-label">Klara</div>
              </div>
              <div class="pile-box retry-pile">
                <div class="pile-count">{retryPile.length}</div>
                <div class="pile-label">Öva igen</div>
              </div>
            </div>

            <div
              class={`card-area${showAnswerAfterWrong ? ' card-area-clickable' : ''}`}
              key={cardKey}
              onClick={showAnswerAfterWrong ? handleShowAnswerDismiss : undefined}
              role={showAnswerAfterWrong ? 'button' : undefined}
              aria-label={showAnswerAfterWrong ? 'Klicka för att fortsätta' : undefined}
            >
              <div class={`flashcard${flipped ? ' flipped' : ''}${shaking ? ' wrong' : ''}${answerState === 'correct' && !showAnswerAfterWrong ? ' correct' : ''}`}>
                <div class="card-face card-front">
                  <div class="card-question">{question}</div>
                </div>
                <div class="card-face card-back">
                  <div class="card-answer">{answer}</div>
                  <div class="card-answer-label">{backLabel}</div>
                </div>
              </div>
            </div>

            <div class={answerDisplayClass}>
              {inputValue || <span class="answer-placeholder">Skriv ditt svar</span>}
            </div>
          </div>

          <div class="game-keypad-col flex flex-col items-center gap-2.5 w-full max-w-xs">
            <NumericKeypad
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              disabled={flipped || showAnswerAfterWrong}
              user={user}
              onPeek={handlePeek}
              onHint={handleHint}
              flipped={flipped}
              peekSavers={peekSavers}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default GamePage
