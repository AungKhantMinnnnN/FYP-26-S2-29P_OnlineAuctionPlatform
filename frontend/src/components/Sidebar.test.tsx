import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderSidebar(role: string | undefined, onNavigate?: () => void) {
  mockUseAuth.mockReturnValue({ role })
  return render(
    <MemoryRouter>
      <Sidebar onNavigate={onNavigate} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('shows only user-role links for a regular user, none of the admin links', () => {
    renderSidebar('user')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Seller Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Users$/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Moderation/ })).toBeNull()
  })

  it('shows only admin-role links for an admin, none of the user links', () => {
    renderSidebar('admin')
    expect(screen.getByRole('link', { name: /^Users$/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Moderation/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Seller Dashboard/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Create Listing/ })).toBeNull()
  })

  it('shows no links at all when role is undefined', () => {
    renderSidebar(undefined)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('shows the PRO badge on Collector Board for a user', () => {
    renderSidebar('user')
    expect(screen.getByRole('link', { name: /Collector Board/ })).toHaveTextContent('PRO')
  })

  it('calls onNavigate when a link is clicked', async () => {
    const onNavigate = vi.fn()
    renderSidebar('user', onNavigate)
    await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
