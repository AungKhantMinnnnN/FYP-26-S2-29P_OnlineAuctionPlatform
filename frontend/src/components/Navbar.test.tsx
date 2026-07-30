import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

const { mockNavigate, mockUseAuth, mockLogout } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockLogout: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderNavbar(auth: { user?: Record<string, unknown> | null; role?: string }) {
  mockUseAuth.mockReturnValue({ user: null, role: undefined, logout: mockLogout, ...auth })
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogout.mockReset()
  })

  it('shows Sign In / Get Started for a logged-out visitor', () => {
    renderNavbar({ user: null })
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/register')
  })

  it('shows the plain AccountMenu (not the Admin menu) for a non-admin user', () => {
    renderNavbar({ user: { username: 'bob' }, role: 'user' })
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.queryByText('ADMIN')).toBeNull()
  })

  it('shows the Admin trigger for an admin user and logs out from it', async () => {
    renderNavbar({ user: { username: 'root' }, role: 'admin' })
    expect(screen.getByText('Admin')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Admin'))
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }))
    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  // Regression test for a fixed bug: identical hover/click race as
  // AccountMenu.tsx (see its test for the full explanation) — onClick now
  // sets open to true unconditionally instead of toggling, so a realistic
  // mouse click (hover-then-click) opens and stays open.
  it('stays open after a realistic mouse click on the Admin trigger', async () => {
    renderNavbar({ user: { username: 'root' }, role: 'admin' })
    await userEvent.click(screen.getByText('Admin'))
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })

  it('renders the compact MarketplaceNav strip only for role="user"', () => {
    const { rerender } = renderNavbar({ user: { username: 'bob' }, role: 'user' })
    expect(screen.getByRole('link', { name: /Watchlist/ })).toBeInTheDocument()

    mockUseAuth.mockReturnValue({ user: { username: 'root' }, role: 'admin', logout: mockLogout })
    rerender(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )
    expect(screen.queryByRole('link', { name: /Watchlist/ })).toBeNull()
  })

  it('opens the mobile menu and shows the current balance for a non-admin user', async () => {
    renderNavbar({ user: { username: 'bob', balance: 42.5 }, role: 'user' })
    // Mobile toggle is the icon-only button without an accessible name.
    const buttons = screen.getAllByRole('button')
    const toggle = buttons.find((b) => !b.textContent)!
    await userEvent.click(toggle)
    expect(screen.getByText('Balance: $42.50')).toBeInTheDocument()
  })

  it('defaults balance display to $0.00 when the user has no balance field', async () => {
    renderNavbar({ user: { username: 'bob' }, role: 'user' })
    const buttons = screen.getAllByRole('button')
    const toggle = buttons.find((b) => !b.textContent)!
    await userEvent.click(toggle)
    expect(screen.getByText('Balance: $0.00')).toBeInTheDocument()
  })
})
