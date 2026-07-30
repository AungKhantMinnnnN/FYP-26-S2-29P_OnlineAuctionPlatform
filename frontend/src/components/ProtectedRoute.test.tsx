import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderProtected(roles?: string[]) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/browse" element={<div>Browse Page</div>} />
        <Route path="/admin/users" element={<div>Admin Users Page</div>} />
        <Route element={<ProtectedRoute roles={roles} />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('shows a loading spinner and renders neither content nor a redirect while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, role: undefined, loading: true })
    const { container } = renderProtected()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).toBeNull()
    expect(screen.queryByText('Login Page')).toBeNull()
  })

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, role: undefined, loading: false })
    renderProtected()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders the protected content when authenticated with no role restriction', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, role: 'user', loading: false })
    renderProtected()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders the protected content when the role is allowed', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, role: 'admin', loading: false })
    renderProtected(['admin'])
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects a non-admin with a disallowed role to /browse', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, role: 'user', loading: false })
    renderProtected(['admin'])
    expect(screen.getByText('Browse Page')).toBeInTheDocument()
  })

  it('redirects an admin with a disallowed role to /admin/users', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, role: 'admin', loading: false })
    renderProtected(['user'])
    expect(screen.getByText('Admin Users Page')).toBeInTheDocument()
  })
})
