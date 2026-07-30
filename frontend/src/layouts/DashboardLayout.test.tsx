import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DashboardLayout from './DashboardLayout'

const { mockNavigate, mockUseAuth, mockLogout } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockLogout: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }))

function renderLayout(role: string) {
  mockUseAuth.mockReturnValue({ user: { username: 'root', email: 'root@x.com' }, role, logout: mockLogout })
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<div>Page content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogout.mockReset()
  })

  it('renders the plain Navbar shell (no admin header/sidebar) for a non-admin role', () => {
    renderLayout('user')
    expect(screen.getByText('Page content')).toBeInTheDocument()
    expect(screen.queryByText('Admin Console')).toBeNull()
  })

  it('renders the admin shell (header + sidebar) for an admin role', () => {
    renderLayout('admin')
    expect(screen.getByText('Admin Console')).toBeInTheDocument()
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('opens the admin account dropdown on click (no hover race — pure onClick toggle here)', async () => {
    renderLayout('admin')
    await userEvent.click(screen.getByText('root'))
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  it('logs out and navigates to /login from the admin dropdown', async () => {
    renderLayout('admin')
    await userEvent.click(screen.getByText('root'))
    await userEvent.click(screen.getByRole('button', { name: /logout/i }))
    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
