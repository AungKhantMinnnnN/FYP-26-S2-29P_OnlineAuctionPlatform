import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MarketplaceNav from './MarketplaceNav'

describe('MarketplaceNav', () => {
  it('renders every link with the PRO badge only on Collector Board', () => {
    render(
      <MemoryRouter>
        <MarketplaceNav />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: /Auctions/ })).toHaveAttribute('href', '/browse')
    expect(screen.getByRole('link', { name: /User History/ })).toHaveAttribute('href', '/activity')
    expect(screen.getByRole('link', { name: /Watchlist/ })).toHaveAttribute('href', '/watchlist')
    expect(screen.getByRole('link', { name: /Support/ })).toHaveAttribute('href', '/support')
    const collectorLink = screen.getByRole('link', { name: /Collector Board/ })
    expect(collectorLink).toHaveAttribute('href', '/collector-board')
    expect(collectorLink).toHaveTextContent('PRO')
  })

  it('calls onNavigate when a link is clicked', async () => {
    const onNavigate = vi.fn()
    render(
      <MemoryRouter>
        <MarketplaceNav onNavigate={onNavigate} />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByRole('link', { name: /Auctions/ }))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  // Regression test for a fixed bug: `compact` was declared and passed by
  // Navbar but never read, so compact/normal renders were pixel-identical.
  it('applies tighter spacing and smaller text when compact is set', () => {
    const { container: normal } = render(
      <MemoryRouter>
        <MarketplaceNav />
      </MemoryRouter>
    )
    const { container: compact } = render(
      <MemoryRouter>
        <MarketplaceNav compact />
      </MemoryRouter>
    )
    expect(normal.querySelector('nav')).toHaveClass('gap-8')
    expect(compact.querySelector('nav')).toHaveClass('gap-5')
    expect(normal.querySelector('nav')?.className).not.toBe(compact.querySelector('nav')?.className)
  })
})
