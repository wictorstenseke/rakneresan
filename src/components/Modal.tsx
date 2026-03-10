import { useEffect, useRef } from 'preact/hooks'
import type { ComponentChildren } from 'preact'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  ariaLabel: string
  closeAriaLabel: string
  className?: string
  style?: Record<string, string>
  children: ComponentChildren
}

export function Modal({ isOpen, onClose, title, ariaLabel, closeAriaLabel, className, style, children }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      class="hint-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <div
        class={`hint-modal${className ? ` ${className}` : ''}`}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="hint-modal-header">
          <span class="hint-modal-title">{title}</span>
          <button
            ref={closeButtonRef}
            type="button"
            class="hint-close-btn"
            onClick={onClose}
            aria-label={closeAriaLabel}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
