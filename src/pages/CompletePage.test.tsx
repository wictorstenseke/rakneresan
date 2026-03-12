import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/preact'
import { act } from 'preact/test-utils'
import { CompletePage } from './CompletePage'

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    addCredits: vi.fn().mockResolvedValue(undefined),
    addPeekSavers: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../lib/storageContext', () => ({
  storage: mockStorage,
}))

function makeResult(overrides: Partial<{
  clearCount: number
  retryCount: number
  allClear: boolean
  table: number
  categoryId: number
  wins: number
}> = {}) {
  return {
    clearCount: 8,
    retryCount: 2,
    allClear: false,
    table: 3,
    categoryId: 3,
    wins: 0,
    ...overrides,
  }
}

describe('CompletePage', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the streak badge when allClear with wins > 0', () => {
    const { container } = render(
      <CompletePage
        result={makeResult({ allClear: true, wins: 3, categoryId: 3 })}
        user="alice"
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    const badge = container.querySelector('.streak-badge')
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toContain('3')
    expect(badge?.textContent).toContain('vinster')
    expect(badge?.textContent).toContain('3:ans tabell')
  })

  it('does not show streak badge when not allClear', () => {
    const { container } = render(
      <CompletePage
        result={makeResult({ allClear: false, wins: 5 })}
        user="alice"
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(container.querySelector('.streak-badge')).toBeNull()
  })

  it('shows "SPELA IGEN!" continue button when allClear', () => {
    render(
      <CompletePage
        result={makeResult({ allClear: true, wins: 1 })}
        user="alice"
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByText(/SPELA IGEN/)).toBeTruthy()
  })

  it('shows "FORTSÄTT ÖVA!" continue button when not allClear', () => {
    render(
      <CompletePage
        result={makeResult({ allClear: false })}
        user="alice"
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByText(/FORTSÄTT ÖVA/)).toBeTruthy()
  })

  it('continue button calls onContinue', async () => {
    const onContinue = vi.fn()
    render(
      <CompletePage
        result={makeResult({ allClear: true, wins: 1 })}
        user="alice"
        onContinue={onContinue}
        onBack={vi.fn()}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByText(/SPELA IGEN/))
    })

    expect(onContinue).toHaveBeenCalled()
  })

  it('home button calls onBack', async () => {
    const onBack = vi.fn()
    render(
      <CompletePage
        result={makeResult()}
        user="alice"
        onContinue={vi.fn()}
        onBack={onBack}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByText(/JAG ÄR KLAR/))
    })

    expect(onBack).toHaveBeenCalled()
  })

  it('shows the reward choice section with credits and peek saver buttons', () => {
    const { container } = render(
      <CompletePage
        result={makeResult()}
        user="alice"
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(container.querySelector('.btn-reward-credits')).not.toBeNull()
    expect(container.querySelector('.btn-reward-saver')).not.toBeNull()
  })

  it('choosing credits reward calls storage.addCredits and shows feedback', async () => {
    const { container } = render(
      <CompletePage
        result={makeResult({ categoryId: 3 })}
        user="alice"
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    await act(async () => {
      fireEvent.click(container.querySelector('.btn-reward-credits')!)
    })

    expect(mockStorage.addCredits).toHaveBeenCalledWith('alice', expect.any(Number))
    // After choosing, the reward choice section is replaced by feedback
    await act(async () => {})
    expect(container.querySelector('.reward-feedback')).not.toBeNull()
  })

  it('choosing peek saver reward calls storage.addPeekSavers and shows feedback', async () => {
    const { container } = render(
      <CompletePage
        result={makeResult()}
        user="alice"
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    await act(async () => {
      fireEvent.click(container.querySelector('.btn-reward-saver')!)
    })

    expect(mockStorage.addPeekSavers).toHaveBeenCalledWith('alice', 1)
    await act(async () => {})
    expect(container.querySelector('.reward-feedback')).not.toBeNull()
  })

  it('home button calls addCredits as auto-reward when no reward was chosen', async () => {
    const onBack = vi.fn()
    render(
      <CompletePage
        result={makeResult()}
        user="alice"
        onContinue={vi.fn()}
        onBack={onBack}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByText(/JAG ÄR KLAR/))
    })

    // Credits are awarded automatically on leaving without choosing a reward
    expect(mockStorage.addCredits).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalled()
  })
})
