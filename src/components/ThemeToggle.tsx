import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      class="back-chip"
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Byt till mörkt läge' : 'Byt till ljust läge'}
      title={theme === 'light' ? 'Mörkt läge' : 'Ljust läge'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
