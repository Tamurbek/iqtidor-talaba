import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth()
  if (isLoading) return null
  if (!currentUser) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth()
  if (isLoading) return null
  if (!currentUser) return <Navigate to="/login?next=/admin" replace />
  if (currentUser.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
