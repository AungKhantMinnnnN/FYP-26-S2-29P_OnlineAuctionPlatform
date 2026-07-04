import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  roles?: string[]
}

export default function ProtectedRoute({ roles = [] }: ProtectedRouteProps) {
  const { isAuthenticated, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-600 border-t-transparent dark:border-accent-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles.length && role && !roles.includes(role)) {
    return <Navigate to={role === 'admin' ? '/admin-dashboard' : '/browse'} replace />
  }

  return <Outlet />
}
