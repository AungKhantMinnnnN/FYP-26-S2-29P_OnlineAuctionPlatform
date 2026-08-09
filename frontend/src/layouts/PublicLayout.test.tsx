import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PublicLayout from './PublicLayout'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, role: undefined, logout: vi.fn() }),
}))

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<div>Landing content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('PublicLayout', () => {
  it('renders the routed page content inside <main>', () => {
    renderLayout()
    expect(screen.getByText('Landing content')).toBeInTheDocument()
  })

  it('renders the Navbar', () => {
    const { container } = renderLayout()
    // "AuctionHub" also appears in the footer brand column, so scope to <nav>.
    expect(container.querySelector('nav')).toHaveTextContent('AuctionHub')
  })

  it('renders footer links to the right routes', () => {
    const { container } = renderLayout()
    const footer = container.querySelector('footer')!
    expect(within(footer).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(footer).getAllByRole('link', { name: /Browse Auctions|Categories/ })[0]).toHaveAttribute('href', '/browse')
    expect(within(footer).getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
    expect(within(footer).getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
    expect(within(footer).getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms')
  })

  it('renders the current year in the copyright line', () => {
    renderLayout()
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })
})
