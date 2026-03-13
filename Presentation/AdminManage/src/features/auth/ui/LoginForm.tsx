import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'

type LoginFormProps = {
  redirectPath?: string
}

export const LoginForm = ({ redirectPath = '/dashboard' }: LoginFormProps) => {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      await login({ email, password })
      navigate(redirectPath, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid credentials. Please try again.'
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <label className="auth-label" htmlFor="email">
        Email
      </label>
      <div className="auth-input">
        <span className="auth-input-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v.2l8 5 8-5V7H4zm16 10V9.5l-8 5-8-5V17h16z"
              fill="currentColor"
            />
          </svg>
        </span>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@vinhkhanh.com"
          required
          autoComplete="email"
        />
      </div>

      <label className="auth-label" htmlFor="password">
        Mật khẩu
      </label>
      <div className="auth-input">
        <span className="auth-input-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V8a4 4 0 10-8 0v2z"
              fill="currentColor"
            />
          </svg>
        </span>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <button type="submit" disabled={isLoading} className="auth-submit">
        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  )
}
