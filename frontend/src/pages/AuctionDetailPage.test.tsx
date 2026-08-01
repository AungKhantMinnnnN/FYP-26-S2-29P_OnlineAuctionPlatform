import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AuctionDetailPage from './AuctionDetailPage'
import apiClient from '../api/apiClient'
import { getMyWatchlist, addToWatchlist, removeFromWatchlist } from '../api/usersApi'
import { getAuctions } from '../api/auctionsApi'

const { mockUseAuth, mockRefreshUser } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockRefreshUser: vi.fn(),
}))

vi.mock('../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
vi.mock('../api/apiClient', () => ({ default: { get: vi.fn() } }))
vi.mock('../api/usersApi', () => ({
  getMyWatchlist: vi.fn(),
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
}))
vi.mock('../api/auctionsApi', () => ({ getAuctions: vi.fn() }))

class MockWebSocket {
  static OPEN = 1
  static CONNECTING = 0
  static CLOSED = 3
  static instances: MockWebSocket[] = []
  readyState = MockWebSocket.OPEN
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: ((e: { wasClean: boolean }) => void) | null = null
  send = vi.fn()
  close = vi.fn()
  url: string
  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }
}

class TestErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) return <div data-testid="error-boundary">{this.state.error.message}</div>
    return this.props.children
  }
}

const baseAuction = {
  id: 'a1',
  seller_id: 's1',
  seller: { username: 'seller1' },
  category_id: 'c1',
  category: 'Watches',
  title: 'Vintage Watch',
  description: 'A fine watch',
  brand: 'Rolex',
  condition: 'used',
  bidding_type: 'price_up',
  starting_price: 100,
  reserve_price: null,
  current_price: 150,
  min_increment: 5,
  status: 'active',
  start_time: '2026-01-01T00:00:00Z',
  end_time: new Date(Date.now() + 3600_000).toISOString(),
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  images: [],
}

function mockAuctionFetch(auctionOverrides: Record<string, unknown> = {}, bids: unknown[] = []) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url.includes('/bids')) return { data: bids }
    return { data: { ...baseAuction, ...auctionOverrides } }
  })
}

function renderPage(id = 'a1') {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/auction/${id}`]}>
        <TestErrorBoundary>
          <Routes>
            <Route path="/auction/:id" element={<AuctionDetailPage />} />
          </Routes>
        </TestErrorBoundary>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AuctionDetailPage', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket)
    MockWebSocket.instances = []
    mockUseAuth.mockReturnValue({ user: null, refreshUser: mockRefreshUser })
    vi.mocked(getMyWatchlist).mockResolvedValue({ items: [], listing_ids: [] })
    vi.mocked(getAuctions).mockResolvedValue({ items: [], total: 0, page: 1, size: 7, pages: 0 })
    vi.mocked(addToWatchlist).mockReset()
    vi.mocked(removeFromWatchlist).mockReset()
    mockRefreshUser.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a loading state, then the auction title once fetched', async () => {
    mockAuctionFetch()
    renderPage()
    expect(screen.getByText('Loading auction details...')).toBeInTheDocument()
    // "Vintage Watch" also appears in the breadcrumb, so scope to the <h1>.
    expect(await screen.findByRole('heading', { name: 'Vintage Watch' })).toBeInTheDocument()
  })

  it('shows an error message when the auction fails to load', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network down'))
    renderPage()
    expect(await screen.findByText(/Failed to load auction details/)).toBeInTheDocument()
  })

  it('prompts to sign in instead of showing a bid form for a guest', async () => {
    mockAuctionFetch()
    renderPage()
    expect(await screen.findByText('Sign in to place a bid on this auction.')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Enter at least/)).toBeNull()
  })

  describe('minimumBid computation', () => {
    it('public bidding type requires currentBid + 1.00 regardless of bid count', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', balance: 1000 }, refreshUser: mockRefreshUser })
      mockAuctionFetch({ bidding_type: 'public', current_price: 150 }, [{ id: 'b1', bidder: { username: 'x' }, amount: 150, placed_at: '2026-01-01T00:00:00Z' }])
      renderPage()
      expect(await screen.findByPlaceholderText('Enter at least $151.00')).toBeInTheDocument()
    })

    it('low_start with zero bids requires exactly the starting price', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', balance: 1000 }, refreshUser: mockRefreshUser })
      mockAuctionFetch({ bidding_type: 'low_start', starting_price: 20, current_price: 20 }, [])
      renderPage()
      expect(await screen.findByPlaceholderText('Enter at least $20.00')).toBeInTheDocument()
    })

    it('standard bidding after the first bid requires currentBid + min_increment', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', balance: 1000 }, refreshUser: mockRefreshUser })
      mockAuctionFetch(
        { bidding_type: 'price_up', current_price: 150, min_increment: 5 },
        [{ id: 'b1', bidder: { username: 'x' }, amount: 150, placed_at: '2026-01-01T00:00:00Z' }]
      )
      renderPage()
      expect(await screen.findByPlaceholderText('Enter at least $155.00')).toBeInTheDocument()
    })

    // Regression test for a fixed crash: AuctionListing.starting_price is
    // typed as optional, but the low_start/first-bid branches of minimumBid
    // used to call `auction.starting_price.toFixed(2)` directly with no null
    // check, throwing inside a useMemo during render (with no recovery UI —
    // caught only by the test's own error boundary). It now falls back to 0.
    it('falls back to $0.00 instead of crashing when starting_price is missing on a zero-bid listing', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', balance: 1000 }, refreshUser: mockRefreshUser })
      mockAuctionFetch({ bidding_type: 'price_up', starting_price: undefined, current_price: undefined }, [])
      renderPage()
      expect(await screen.findByPlaceholderText('Enter at least $0.00')).toBeInTheDocument()
      expect(screen.queryByTestId('error-boundary')).toBeNull()
    })
  })

  describe('handleBid validation', () => {
    async function setUpActiveAuctionWithUser(balance = 1000) {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', balance }, refreshUser: mockRefreshUser })
      mockAuctionFetch({ bidding_type: 'price_up', current_price: 150, min_increment: 5 }, [])
      renderPage()
      await screen.findByPlaceholderText(/Enter at least/)
    }

    // Bug: the bid input carries a live `min={minimumBid}` attribute, so a
    // browser's (and jsdom's) native constraint validation blocks the submit
    // event before handleSubmit ever runs when the typed amount is below
    // minimumBid — the same value the JS check also compares against. The
    // polished, in-app "Bid must be at least $X.XX." message is therefore
    // unreachable via a normal button click; a real user instead sees the
    // browser's own unstyled "value must be greater than or equal to..."
    // tooltip. Assert the reachable behavior instead.
    it('BUG: native min-attribute validation blocks a below-minimum bid before the custom error can show', async () => {
      await setUpActiveAuctionWithUser()
      const input = screen.getByPlaceholderText(/Enter at least/) as HTMLInputElement
      await userEvent.type(input, '10')
      await userEvent.click(screen.getByRole('button', { name: 'Place Bid' }))
      expect(input.validity.rangeUnderflow).toBe(true)
      expect(screen.queryByText(/Bid must be at least/)).toBeNull()
      expect(MockWebSocket.instances[0].send).not.toHaveBeenCalled()
    })

    it('rejects a bid that exceeds the balance', async () => {
      await setUpActiveAuctionWithUser(50)
      await userEvent.type(screen.getByPlaceholderText(/Enter at least/), '200')
      await userEvent.click(screen.getByRole('button', { name: 'Place Bid' }))
      expect(screen.getByText('Insufficient Balance. Please top up your wallet first.')).toBeInTheDocument()
    })

    it('sends a valid bid over the websocket and shows a pending message', async () => {
      await setUpActiveAuctionWithUser(1000)
      await userEvent.type(screen.getByPlaceholderText(/Enter at least/), '200')
      await userEvent.click(screen.getByRole('button', { name: 'Place Bid' }))
      expect(MockWebSocket.instances[0].send).toHaveBeenCalledWith(JSON.stringify({ type: 'place_bid', amount: 200 }))
      expect(screen.getByText('Sending bid...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Placing Bid...' })).toBeDisabled()
    })

    it('shows an error instead of sending when the websocket is not open', async () => {
      await setUpActiveAuctionWithUser(1000)
      MockWebSocket.instances[0].readyState = MockWebSocket.CLOSED
      await userEvent.type(screen.getByPlaceholderText(/Enter at least/), '200')
      await userEvent.click(screen.getByRole('button', { name: 'Place Bid' }))
      expect(screen.getByText('Real-time connection is unavailable. Please refresh.')).toBeInTheDocument()
    })
  })

  describe('websocket message handling', () => {
    it('applies an incoming new_bid message: updates current bid, bid count, and history', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u2', balance: 1000 }, refreshUser: mockRefreshUser })
      mockAuctionFetch({ bidding_type: 'price_up', current_price: 150 }, [])
      renderPage()
      await screen.findByText('0 bids placed')

      MockWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({ type: 'new_bid', current_price: 175, bidder_id: 'someone-else', bidder_username: 'carol', amount: 175 }),
      })

      expect(await screen.findByText('1 bids placed')).toBeInTheDocument()
      expect(screen.getByText('carol')).toBeInTheDocument()
      expect(mockRefreshUser).not.toHaveBeenCalled()
    })

    it('calls refreshUser only when the incoming bid belongs to the current user', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', balance: 1000 }, refreshUser: mockRefreshUser })
      mockAuctionFetch({ bidding_type: 'price_up' }, [])
      renderPage()
      await screen.findByText('0 bids placed')

      MockWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({ type: 'new_bid', current_price: 200, bidder_id: 'u1', amount: 200 }),
      })

      await waitFor(() => expect(mockRefreshUser).toHaveBeenCalledTimes(1))
    })

    it('applies an incoming error message as bidError and clears pending state', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', balance: 1000 }, refreshUser: mockRefreshUser })
      mockAuctionFetch({ bidding_type: 'price_up' }, [])
      renderPage()
      await screen.findByPlaceholderText(/Enter at least/)

      MockWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({ type: 'error', message: 'Someone outbid you first' }),
      })

      expect(await screen.findByText('Someone outbid you first')).toBeInTheDocument()
    })
  })

  describe('watchlist toggle', () => {
    it('adds to the watchlist and reflects the watched state', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', balance: 1000 }, refreshUser: mockRefreshUser })
      mockAuctionFetch()
      vi.mocked(addToWatchlist).mockResolvedValue({ watchlist_id: 'w1', listing_id: 'a1', added_at: 'now' })
      renderPage()
      await userEvent.click(await screen.findByRole('button', { name: /Watchlist/ }))
      expect(addToWatchlist).toHaveBeenCalledWith('a1')
      expect(await screen.findByText('Added to Watchlist')).toBeInTheDocument()
    })

    it('shows an error message when the watchlist call fails', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', balance: 1000 }, refreshUser: mockRefreshUser })
      mockAuctionFetch()
      vi.mocked(addToWatchlist).mockRejectedValue(new Error('boom'))
      renderPage()
      await userEvent.click(await screen.findByRole('button', { name: /Watchlist/ }))
      expect(await screen.findByText('Could not update your watchlist. Please try again.')).toBeInTheDocument()
    })
  })
})
