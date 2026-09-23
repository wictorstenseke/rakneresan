import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/preact'
import { OfflineBadge } from './OfflineBadge'

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

describe('OfflineBadge', () => {
  beforeEach(() => cleanup())
  afterEach(() => setOnline(true))

  it('is hidden while online', () => {
    setOnline(true)
    render(<OfflineBadge />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('can be dismissed and reappears on the next offline period', () => {
    setOnline(false)
    render(<OfflineBadge />)
    expect(screen.getByRole('status').textContent).toContain('Du är offline')

    act(() => { fireEvent.click(screen.getByLabelText('Stäng')) })
    expect(screen.queryByRole('status')).toBeNull()

    act(() => setOnline(true))
    act(() => setOnline(false))
    expect(screen.getByRole('status')).not.toBeNull()
  })
})
