import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/preact'
import { HistoryModal } from './HistoryModal'

describe('HistoryModal', () => {
  beforeEach(() => cleanup())

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <HistoryModal isOpen={false} onClose={() => {}} log={[]} />,
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('when isOpen and log empty, shows empty message', () => {
    const { getByText } = render(
      <HistoryModal isOpen onClose={() => {}} log={[]} />,
    )
    expect(getByText('Inga avklarade tabeller ännu!')).toBeTruthy()
  })

  it('when isOpen and log has entries, shows rows sorted by timestamp descending', () => {
    const log = [
      { table: 1, timestamp: 1000 },
      { table: 2, timestamp: 3000 },
      { table: 3, timestamp: 2000 },
    ]
    const { container } = render(
      <HistoryModal isOpen onClose={() => {}} log={log} />,
    )
    const rows = container.querySelectorAll('.history-row')
    expect(rows).toHaveLength(3)
    expect(rows[0].textContent).toContain('2:ans tabell')
    expect(rows[1].textContent).toContain('3:ans tabell')
    expect(rows[2].textContent).toContain('1:ans tabell')
  })

  it('close button calls onClose', () => {
    const onClose = vi.fn()
    const { getByLabelText } = render(
      <HistoryModal isOpen onClose={onClose} log={[]} />,
    )
    fireEvent.click(getByLabelText('Stäng historik'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape key calls onClose', () => {
    const onClose = vi.fn()
    render(<HistoryModal isOpen onClose={onClose} log={[]} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
