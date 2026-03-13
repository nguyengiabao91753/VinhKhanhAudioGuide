type ConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        className="app-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 800,
          }}
        >
          {title}
        </h3>

        <p
          className="app-muted"
          style={{
            marginTop: '12px',
            marginBottom: '20px',
          }}
        >
          {message}
        </p>

        <div className="app-inline-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="app-button" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </button>

          <button
            className="app-button app-button-danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}