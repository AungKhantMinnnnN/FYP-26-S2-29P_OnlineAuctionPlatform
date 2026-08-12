import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UserDashboardPage from './UserDashboardPage'
import { getAuctions } from '../api/auctionsApi'
import { getMyBids, getMyWatchlist, getMyQuota } from '../api/usersApi'
import { getTrending } from '../api/recommendationsApi'

vi.mock('../api/auctionsApi', () => ({ getAuctions: vi.fn() }))
vi.mock('../api/usersApi', () => ({
  getMyBids: vi.fn(),
  getMyWatchlist: vi.fn(),
  getMyQuota: vi.fn(),
}))
vi.mock('../api/recommendationsApi', () => ({ getTrending: vi.fn() }))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser(), logout: vi.fn() }),
}))

const { mockUser } = vi.hoisted(() => ({ mockUser: vi.fn() }))

const mockedGetQuota = vi.mocked(getMyQuota)
const mockedGetBids = vi.mocked(getMyBids)
const mockedGetWatchlist = vi.mocked(getMyWatchlist)
const mockedGetAuctions = vi.mocked(getAuctions)
const mockedGetTrending = vi.mocked(getTrending)

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <UserDashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

function setupEmptyApi() {
  mockedGetAuctions.mockResolvedValue({ items: [] } as never)
  mockedGetBids.mockResolvedValue({ items: [] } as never)
  mockedGetWatchlist.mockResolvedValue({ listing_ids: [], items: [] } as never)
  mockedGetTrending.mockResolvedValue({ items: [] } as never)
}

const freeQuota = {
  tier: 'free',
  bids: { limit: 10, used: 4, remaining: 6, resets_at: null },
  listings: { limit: 5, used: 2, remaining: 3, resets_at: null },
} as never

const premiumQuota = { tier: 'premium', bids: null, listings: null } as never

describe('UserDashboardPage quota cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.mockReturnValue({ id: 'u1', balance: 0, subscription_tier: 'free' })
    setupEmptyApi()
  })

  it('shows remaining bids and listings for a free user', async () => {
    mockedGetQuota.mockResolvedValue(freeQuota)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Bids Left')).toBeInTheDocument()
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('Listings Left')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('shows "Available now" for free quota with no active window', async () => {
    mockedGetQuota.mockResolvedValue(freeQuota)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getAllByText('Available now').length).toBeGreaterThan(0)
    })
  })

  it('shows Unlimited for a premium user', async () => {
    mockUser.mockReturnValue({ id: 'u1', balance: 0, subscription_tier: 'premium' })
    mockedGetQuota.mockResolvedValue(premiumQuota)
    renderDashboard()
    await waitFor(() => {
      // Both quota cards render "Unlimited"
      expect(screen.getAllByText('Unlimited').length).toBe(2)
    })
  })
})