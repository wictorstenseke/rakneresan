import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import type { JSX } from 'preact'
import { COLORS, COLORS2 } from '../lib/constants'
import { useGame } from '../hooks/useGame'
import type { RoundResult } from '../hooks/useGame'

interface GamePageProps {
  table: number
  user: string
  onBack: () => void
  onComplete: (result: RoundResult) => void
}

export function GamePage({ table, user, onBack, onComplete }: GamePageProps) {
  const { gameState, roundResult, startGame, submitAnswer, peekCard } = useGame(user)
  const [inputValue, setInputValue] = useState('')
  const [inputClass, setInputClass] = useState('answer-input')
  const [flipped, setFlipped] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [cardKey, setCardKey] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const startedRef = useRef(false)

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

  // Focus input when current card changes
  useEffect(() => {
    if (gameState.current) {
      setInputValue('')
      setInputClass('answer-input')
      setFlipped(false)
      setShaking(false)
      setCardKey(k => k + 1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [gameState.current?.n, gameState.deck.length])

  const floatFeedback = useCallback((text: string, good: boolean) => {
    const el = document.createElement('div')
    el.className = 'float-feedback'
    el.textContent = text
    el.style.color = good ? '#2D9B4A' : '#E06B1F'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 900)
  }, [])

  const handleSubmit = useCallback((e?: JSX.TargetedEvent<HTMLFormElement>) => {
    e?.preventDefault()
    if (flipped) return

    const val = parseInt(inputValue)
    if (isNaN(val) || inputValue === '') return

    const result = submitAnswer(val)
    if (result === 'correct') {
      setInputClass('answer-input correct')
      floatFeedback('🎉 Rätt!', true)
      setFlipped(true)
      // After flip animation, card will move (handled by useGame timeout)
    } else if (result === 'wrong') {
      const correct = gameState.table * (gameState.current?.n ?? 0)
      setInputClass('answer-input wrong')
      setShaking(true)
      floatFeedback(`✗ Det är ${correct}`, false)
      setTimeout(() => {
        setShaking(false)
        setInputClass('answer-input')
        setInputValue('')
        inputRef.current?.focus()
      }, 600)
    }
  }, [inputValue, flipped, submitAnswer, floatFeedback, gameState.table, gameState.current?.n])

  const handlePeek = useCallback(() => {
    if (flipped) return
    setFlipped(true)
    peekCard()
    // After peek timeout, card will be moved (handled by useGame)
  }, [flipped, peekCard])

  const { deck, clearPile, retryPile, current } = gameState
  const done = clearPile.length + retryPile.length
  const total = deck.length + done

  if (!current) {
    return <div class="screen active game-screen" />
  }

  const question = `${gameState.table} × ${current.n}`
  const answer = gameState.table * current.n

  return (
    <div class="screen active game-screen">
      <div class="game-header">
        <button class="btn-back" onClick={onBack}>← </button>
        <div class="game-title">Gångertabell {gameState.table}</div>
        <div class="progress-text">{done}/{total}</div>
      </div>

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

      <div class="card-area" key={cardKey}>
        <div class={`flashcard${flipped ? ' flipped' : ''}${shaking ? ' wrong' : ''}`}>
          <div class="card-face card-front">
            <div class="card-question">{question}</div>
            <div class="card-hint">Skriv ditt svar ↓</div>
          </div>
          <div class="card-face card-back">
            <div class="card-answer">{answer}</div>
            <div class="card-answer-label">{question} = {answer}</div>
          </div>
        </div>
      </div>

      <form class="answer-area" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          class={inputClass}
          value={inputValue}
          onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
          placeholder="?"
          autoComplete="off"
        />
        <div class="action-btns">
          <button type="button" class="btn-peek" onClick={handlePeek}>👀 Titta</button>
          <button type="submit" class="btn-submit">Svara ✓</button>
        </div>
      </form>
    </div>
  )
}
