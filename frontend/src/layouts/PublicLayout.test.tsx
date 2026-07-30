import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    renderLayout()
    expect(screen.getByRole('link', { name: 'Sell an Item' })).toHaveAttribute('href', '/register')
    expect(screen.getAllByRole('link', { name: /Live Auctions|Categories/ })[0]).toHaveAttribute('href', '/browse')
  })

  it('renders the current year in the copyright line', () => {
    renderLayout()
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })
})
