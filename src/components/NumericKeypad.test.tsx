import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/preact'
import { NumericKeypad } from './NumericKeypad'

const mockGetPreference = vi.fn(() => null)
const mockSetPreference = vi.fn()

vi.mock('../lib/preferences', () => ({
  getPreference: (...args: unknown[]) => mockGetPreference(...args),
  setPreference: (...args: unknown[]) => mockSetPreference(...args),
}))

describe('NumericKeypad', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockGetPreference.mockReturnValue(null)
  })

  function renderKeypad(props: {
    value?: string
    onChange?: (v: string) => void
    onSubmit?: () => void
    disabled?: boolean
    onPeek?: () => void
    onHint?: () => void
    flipped?: boolean
  } = {}) {
    const onChange = props.onChange ?? vi.fn()
    const onSubmit = props.onSubmit ?? vi.fn()
    return render(
      <NumericKeypad
        value={props.value ?? ''}
        onChange={onChange}
        onSubmit={onSubmit}
        disabled={props.disabled}
        user="testuser"
        onPeek={props.onPeek}
        onHint={props.onHint}
        flipped={props.flipped}
      />,
    )
  }

  it('renders digit keys 0-9 and action keys', () => {
    const { getByText } = renderKeypad()
    expect(getByText('1')).toBeTruthy()
    expect(getByText('0')).toBeTruthy()
    expect(getByText('✓')).toBeTruthy()
    expect(getByText('⌫')).toBeTruthy()
  })

  it('digit key appends value and calls onChange', () => {
    const onChange = vi.fn()
    const { getByText } = renderKeypad({ value: '1', onChange })
    fireEvent.click(getByText('2'))
    expect(onChange).toHaveBeenCalledWith('12')
  })

  it('backspace removes last digit and calls onChange', () => {
    const onChange = vi.fn()
    const { getByText } = renderKeypad({ value: '42', onChange })
    fireEvent.click(getByText('⌫'))
    expect(onChange).toHaveBeenCalledWith('4')
  })

  it('submit key calls onSubmit', () => {
    const onSubmit = vi.fn()
    const { getByText } = renderKeypad({ onSubmit })
    fireEvent.click(getByText('✓'))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('max 3 digits: 4th digit does not call onChange', () => {
    const onChange = vi.fn()
    const { getByText } = renderKeypad({ value: '123', onChange })
    fireEvent.click(getByText('4'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('when disabled, digit and submit keys do nothing', () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const { getByText } = renderKeypad({ disabled: true, onChange, onSubmit })
    fireEvent.click(getByText('1'))
    fireEvent.click(getByText('✓'))
    expect(onChange).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('when disabled, backspace does not call onChange (handler returns early)', () => {
    const onChange = vi.fn()
    const { getByText } = renderKeypad({ value: '5', disabled: true, onChange })
    fireEvent.click(getByText('⌫'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('hand toggle toggles right-handed and left-handed class', () => {
    const { getByText, container } = renderKeypad()
    const wrapper = container.querySelector('.keypad-wrapper')
    expect(wrapper?.className).toContain('right-handed')
    expect(wrapper?.className).not.toContain('left-handed')

    fireEvent.click(getByText('Byt sida'))
    expect(wrapper?.className).toContain('left-handed')
    expect(wrapper?.className).not.toContain('right-handed')

    fireEvent.click(getByText('Byt sida'))
    expect(wrapper?.className).toContain('right-handed')
    expect(mockSetPreference).toHaveBeenCalledWith('testuser', 'handedness', 'left')
    expect(mockSetPreference).toHaveBeenCalledWith('testuser', 'handedness', 'right')
  })
})
