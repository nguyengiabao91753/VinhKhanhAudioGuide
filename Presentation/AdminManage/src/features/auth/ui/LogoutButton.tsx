import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'

type LogoutButtonProps = {
  className?: string
  label?: string
}

export const LogoutButton = ({ className, label = 'Logout' }: LogoutButtonProps) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {label}
    </button>
  )
}
