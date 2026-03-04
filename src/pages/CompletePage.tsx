import type { RoundResult } from '../hooks/useGame'

interface CompletePageProps {
  result: RoundResult
  onContinue: () => void
  onBack: () => void
}

export function CompletePage({ result, onContinue, onBack }: CompletePageProps) {
  const { clearCount, retryCount, allClear, table, wins } = result
  const emoji = allClear ? '🏆' : '💪'
  const heading = allClear ? 'Alla klara!' : 'Bra jobbat!'
  const message = allClear
    ? `Du klarade hela ${table}:ans gångertabell! Det var vinst nummer ${wins}! 🌟`
    : `Du övade ${table}:ans gångertabell. Fortsätt öva så klarar du alla!`

  return (
    <div class="screen active complete-screen">
      <div class="complete-box">
        <span class="complete-emoji">{emoji}</span>
        <h2>{heading}</h2>
        <p>{message}</p>

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
          <button class="btn-secondary" onClick={onBack}>
            ← Tillbaka till tabellerna
          </button>
        </div>
      </div>
    </div>
  )
}
