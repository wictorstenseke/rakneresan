import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/preact'
import { HintModal } from './HintModal'

describe('HintModal', () => {
  beforeEach(() => cleanup())

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <HintModal
        categoryId={1}
        operation="multiply"
        isOpen={false}
        onClose={() => {}}
        tableColor="#ff0000"
      />,
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('when isOpen and operation=multiply, shows 10 hint chips', () => {
    const { container } = render(
      <HintModal
        categoryId={3}
        operation="multiply"
        isOpen
        onClose={() => {}}
        tableColor="#ff0000"
      />,
    )
    const chips = container.querySelectorAll('.hint-chip')
    expect(chips).toHaveLength(10)
  })

  it('when operation=add, shows equation chips from equations prop', () => {
    const equations = [{ a: 5, b: 3 }, { a: 10, b: 7 }]
    const { container } = render(
      <HintModal
        categoryId={11}
        operation="add"
        isOpen
        onClose={() => {}}
        tableColor="#ff0000"
        equations={equations}
      />,
    )
    const chips = container.querySelectorAll('.hint-chip-eq')
    expect(chips).toHaveLength(2)
    expect(chips[0].textContent).toContain('5')
    expect(chips[0].textContent).toContain('3')
    expect(chips[0].textContent).toContain('+')
  })

  it('close button calls onClose', () => {
    const onClose = vi.fn()
    const { getByLabelText } = render(
      <HintModal
        categoryId={1}
        operation="multiply"
        isOpen
        onClose={onClose}
        tableColor="#ff0000"
      />,
    )
    fireEvent.click(getByLabelText('Stäng hjälp'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape key calls onClose', () => {
    const onClose = vi.fn()
    render(
      <HintModal
        categoryId={1}
        operation="multiply"
        isOpen
        onClose={onClose}
        tableColor="#ff0000"
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('backdrop click calls onClose', () => {
    const onClose = vi.fn()
    const { container } = render(
      <HintModal
        categoryId={1}
        operation="multiply"
        isOpen
        onClose={onClose}
        tableColor="#ff0000"
      />,
    )
    const backdrop = container.querySelector('.hint-backdrop')
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalled()
  })

  it('inner modal click does not call onClose', () => {
    const onClose = vi.fn()
    const { container } = render(
      <HintModal
        categoryId={1}
        operation="multiply"
        isOpen
        onClose={onClose}
        tableColor="#ff0000"
      />,
    )
    const modal = container.querySelector('.hint-modal')
    fireEvent.click(modal!)
    expect(onClose).not.toHaveBeenCalled()
  })
})
