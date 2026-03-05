import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import { COLORS, COLORS2 } from '../lib/constants'
import { useGame } from '../hooks/useGame'
import { NumericKeypad } from '../components/NumericKeypad'
import { HintModal } from '../components/HintModal'
import type { RoundResult } from '../hooks/useGame'

interface GamePageProps {
  table: number
  user: string
  onBack: () => void
  onComplete: (result: RoundResult) => void
}

const SHOW_ANSWER_DURATION_MS = 12000

export function GamePage({ table, user, onBack, onComplete }: GamePageProps) {
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

  // Start game on mount
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true

      const color = COLORS[table - 1]
      const color2 = COLORS2[table - 1]
      document.documentElement.style.setProperty('--tc', color)
      document.documentElement.style.setProperty('--tc2', color2)

      void startGame(table)
    }
  }, [table, startGame])

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
  }, [gameState])

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
    peekCard()
  }, [flipped, peekCard])

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

  const { deck, clearPile, retryPile, current } = gameState
  const done = clearPile.length + retryPile.length
  const total = deck.length + done
  const tableColor = COLORS[table - 1]

  if (!current) {
    return <div class="screen active game-screen" />
  }

  const question = `${gameState.table} × ${current.n}`
  const answer = gameState.table * current.n
  const answerDisplayClass = `answer-display${answerState !== 'idle' ? ` ${answerState}` : ''}`

  return (
    <div class="screen active game-screen">
      <HintModal
        table={gameState.table}
        isOpen={showHint}
        onClose={() => setShowHint(false)}
        tableColor={tableColor}
      />
      <div class="game-header flex flex-wrap gap-3 md:gap-4">
        <button type="button" class="back-chip" onClick={handleBack} aria-label="Tillbaka">🔙</button>
        <div class="game-title">Gångertabell {gameState.table}</div>
        <div class="progress-text">{done}/{total}</div>
      </div>

      <div class="game-content">
        <div class="game-layout">
          <div class="game-card-col">
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
                  <div class="card-answer-label">{question} = {answer}</div>
                </div>
              </div>
            </div>

            <div class={answerDisplayClass}>
              {inputValue || <span class="answer-placeholder">Skriv ditt svar</span>}
            </div>
          </div>

          <div class="game-keypad-col">
            <NumericKeypad
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              disabled={flipped || showAnswerAfterWrong}
              user={user}
              onPeek={handlePeek}
              onHint={handleHint}
              flipped={flipped}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
