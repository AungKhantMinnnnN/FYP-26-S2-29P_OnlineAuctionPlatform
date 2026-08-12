import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AccountMenu from './AccountMenu'

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

function renderMenu(user: Record<string, unknown> | null) {
  mockUseAuth.mockReturnValue({ user, logout: mockLogout })
  return render(
    <MemoryRouter>
      <AccountMenu />
    </MemoryRouter>
  )
}

describe('AccountMenu', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogout.mockReset()
  })

  it('prefers full_name, then username, then email, then "Account" as the display label', () => {
    renderMenu({ profile: { full_name: 'Bob Smith' }, username: 'bob', email: 'bob@x.com' })
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('falls back to username when there is no profile full_name', () => {
    renderMenu({ username: 'bob', email: 'bob@x.com' })
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('falls back to email when there is no username', () => {
    renderMenu({ email: 'bob@x.com' })
    expect(screen.getByText('bob@x.com')).toBeInTheDocument()
  })

  it('falls back to "Account" when the user has none of the above', () => {
    renderMenu({})
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('opens the menu on a bare click event and shows Dashboard/Wallet/Profile/Logout', () => {
    renderMenu({ username: 'bob' })
    fireEvent.click(screen.getByText('bob'))
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /wallet/i })).toHaveAttribute('href', '/wallet')
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  // The trigger div opens on hover; a real click always fires mouseover before click,
  // so a toggling onClick (`setOpen(!open)`) immediately closed what hover had just
  // opened. onClick now sets open unconditionally so a real click (hover-then-click,
  // as userEvent.click simulates) stays open.
  it('stays open after a realistic mouse click (hover-then-click, like a real browser)', async () => {
    renderMenu({ username: 'bob' })
    await userEvent.click(screen.getByText('bob'))
    expect(screen.getByRole('link', { name: /wallet/i })).toHaveAttribute('href', '/wallet')
  })

  it('calls logout and navigates home when Logout is clicked (menu opened via hover)', async () => {
    renderMenu({ username: 'bob' })
    await userEvent.hover(screen.getByRole('button', { name: /bob/i }))
    await userEvent.click(screen.getByRole('button', { name: /logout/i }))
    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
