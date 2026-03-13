import type { ReactNode } from 'react'

type ModalSize = 'sm' | 'md' | 'lg'

type ModalProps = {
  open: boolean
  title?: string
  size?: ModalSize
  onClose: () => void
  children: ReactNode
}

const sizeClassMap: Record<ModalSize, string> = {
  sm: 'app-modal-sm',
  md: 'app-modal-md',
  lg: 'app-modal-lg',
}

export function Modal({
  open,
  title,
  size = 'md',
  onClose,
  children,
}: ModalProps) {
  if (!open) return null

  return (
    <div className="app-modal-overlay">
      <div className={`app-modal ${sizeClassMap[size]}`}>
        <div className="app-modal-header">
          {title ? <h3 className="app-modal-title">{title}</h3> : <span />}
          <button
            type="button"
            className="app-icon-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6l-12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="app-modal-body">{children}</div>
      </div>
    </div>
  )
}
