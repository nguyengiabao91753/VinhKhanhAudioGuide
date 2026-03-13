import { useToast } from '../model/useToast'

const toastStyleMap = {
  success: {
    bar: '#22c55e',
    iconBg: '#dcfce7',
    iconColor: '#22c55e',
  },
  error: {
    bar: '#f43f5e',
    iconBg: '#ffe4e6',
    iconColor: '#f43f5e',
  },
  info: {
    bar: '#3b82f6',
    iconBg: '#dbeafe',
    iconColor: '#3b82f6',
  },
  warning: {
    bar: '#f59e0b',
    iconBg: '#fef3c7',
    iconColor: '#f59e0b',
  },
} as const

function ToastIcon({ type }: { type: keyof typeof toastStyleMap }) {
  const style = toastStyleMap[type]

  const iconMap = {
    success: '✓',
    error: '✕',
    info: 'i',
    warning: '!',
  }

  return (
    <div
      style={{
        width: 34,
        height: 34,
        minWidth: 34,
        borderRadius: '999px',
        background: style.iconBg,
        color: style.iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 18,
      }}
    >
      {iconMap[type]}
    </div>
  )
}

export function ToastContainer() {
  const { items, removeToast } = useToast()

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 10000,
        display: 'grid',
        gap: 14,
        width: 360,
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      {items.map((toast) => {
        const style = toastStyleMap[toast.type]

        return (
          <div
            key={toast.id}
            style={{
              position: 'relative',
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              background: '#ffffff',
              borderRadius: 14,
              padding: '16px 16px 16px 18px',
              boxShadow: '0 14px 32px rgba(15, 23, 42, 0.12)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 6,
                background: style.bar,
              }}
            />

            <ToastIcon type={toast.type} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#111827',
                  lineHeight: 1.1,
                  marginBottom: 4,
                }}
              >
                {toast.title}
              </div>

              <div
                style={{
                  color: '#6b7280',
                  fontSize: 15,
                  lineHeight: 1.4,
                }}
              >
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                padding: 0,
                marginTop: 2,
              }}
              aria-label="Close toast"
              title="Close"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}