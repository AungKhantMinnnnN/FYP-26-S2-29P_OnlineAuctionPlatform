import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AuctionCard from './AuctionCard'
import { addToWatchlist, removeFromWatchlist } from '../api/usersApi'

const { mockNavigate, mockUseAuth } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../api/usersApi', () => ({
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
}))

const baseAuction = {
  id: '42',
  title: 'Vintage Watch',
  category: 'Watches',
  condition: 'Used',
  currentBid: 120,
  startingPrice: 50,
  endTime: new Date(Date.now() + 3600_000),
  seller: { name: 'Alice', rating: 4.8, ratingCount: 12 },
  bids: 3,
  watchers: 5,
  status: 'active',
  description: 'A nice watch',
}

function renderCard(opts: { user?: unknown; showWatchlist?: boolean; isWatched?: boolean } = {}) {
  mockUseAuth.mockReturnValue({ user: opts.user ?? null })
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuctionCard auction={baseAuction} showWatchlist={opts.showWatchlist} isWatched={opts.isWatched} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AuctionCard', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUseAuth.mockReset()
    vi.mocked(addToWatchlist).mockReset()
    vi.mocked(removeFromWatchlist).mockReset()
  })

  it('shows "View Item" for a guest', () => {
    renderCard({ user: null })
    expect(screen.getByText('View Item')).toBeInTheDocument()
  })

  it('shows "View & Bid" for a signed-in user', () => {
    renderCard({ user: { id: 'u1' } })
    expect(screen.getByText('View & Bid')).toBeInTheDocument()
  })

  it('redirects a guest to /login instead of toggling the watchlist', async () => {
    renderCard({ user: null })
    await userEvent.click(screen.getByTitle('Add to watchlist'))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(addToWatchlist).not.toHaveBeenCalled()
  })

  it('adds to the watchlist and flips the heart icon for a signed-in user', async () => {
    vi.mocked(addToWatchlist).mockResolvedValue({} as never)
    renderCard({ user: { id: 'u1' } })
    await userEvent.click(screen.getByTitle('Add to watchlist'))
    await waitFor(() => expect(addToWatchlist).toHaveBeenCalledWith('42'))
    expect(screen.getByTitle('Remove from watchlist')).toBeInTheDocument()
  })

  it('removes from the watchlist when already watched', async () => {
    vi.mocked(removeFromWatchlist).mockResolvedValue(undefined)
    renderCard({ user: { id: 'u1' }, isWatched: true })
    await userEvent.click(screen.getByTitle('Remove from watchlist'))
    await waitFor(() => expect(removeFromWatchlist).toHaveBeenCalledWith('42'))
    expect(screen.getByTitle('Add to watchlist')).toBeInTheDocument()
  })

  it('hides the watchlist button when showWatchlist is false', () => {
    renderCard({ user: { id: 'u1' }, showWatchlist: false })
    expect(screen.queryByTitle('Add to watchlist')).toBeNull()
  })
})
