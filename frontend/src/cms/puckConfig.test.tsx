import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { puckConfig } from './puckConfig'
import { getFormMetadata } from '../api/auctionsApi'
import { getTrending } from '../api/recommendationsApi'
import { getPublicTestimonials } from '../api/supportApi'
import { getMarketingVideoUrl } from '../api/marketingApi'
import { getMyWatchlist } from '../api/usersApi'

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../api/auctionsApi', () => ({
  getFormMetadata: vi.fn(),
}))
vi.mock('../api/recommendationsApi', () => ({ getTrending: vi.fn() }))
vi.mock('../api/supportApi', () => ({ getPublicTestimonials: vi.fn() }))
vi.mock('../api/marketingApi', () => ({ getMarketingVideoUrl: vi.fn() }))
vi.mock('../api/usersApi', () => ({ getMyWatchlist: vi.fn() }))

type BlockComponent = {
  defaultProps?: Record<string, unknown>
  render: (props: Record<string, unknown>) => React.ReactElement
}

function renderBlock(name: keyof typeof puckConfig.components, props: Record<string, unknown> = {}) {
  const queryClient = new QueryClient()
  const Block = puckConfig.components[name] as unknown as BlockComponent
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{Block.render({ ...Block.defaultProps, ...props })}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('puckConfig blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null })
    vi.mocked(getTrending).mockResolvedValue({ items: [], count: 0, type: 'global' })
    vi.mocked(getFormMetadata).mockResolvedValue({ categories: [], conditions: [], biddingTypes: [], durations: [] })
    vi.mocked(getPublicTestimonials).mockResolvedValue([])
    vi.mocked(getMarketingVideoUrl).mockResolvedValue(null)
    vi.mocked(getMyWatchlist).mockResolvedValue({ items: [], listing_ids: [] })
  })

  describe('Hero', () => {
    it('shows the placeholder play button when there is no active marketing video', async () => {
      renderBlock('Hero')
      await waitFor(() => expect(getMarketingVideoUrl).toHaveBeenCalled())
      expect(screen.getByText('How AuctionHub Works')).toBeInTheDocument()
      expect(document.querySelector('video')).toBeNull()
    })

    it('renders an actual <video> element when a marketing video url is active', async () => {
      vi.mocked(getMarketingVideoUrl).mockResolvedValue('https://cdn/video.mp4')
      renderBlock('Hero')
      await waitFor(() => expect(document.querySelector('video')).toBeInTheDocument())
      expect(document.querySelector('video')).toHaveAttribute('src', 'https://cdn/video.mp4')
    })
  })

  describe('Categories', () => {
    it('shows only active categories, filtering out inactive ones', async () => {
      vi.mocked(getFormMetadata).mockResolvedValue({
        categories: [
          { id: 'c1', name: 'Watches', slug: 'watches', is_active: true },
          { id: 'c2', name: 'Retired Stuff', slug: 'retired', is_active: false },
        ],
        conditions: [],
        biddingTypes: [],
        durations: [],
      })
      renderBlock('Categories')
      await waitFor(() => expect(screen.getByText('Watches')).toBeInTheDocument())
      expect(screen.queryByText('Retired Stuff')).toBeNull()
    })
  })

  describe('TrendingAuctions', () => {
    it('shows the empty state when there are no auctions', async () => {
      renderBlock('TrendingAuctions')
      await waitFor(() => expect(screen.getByText('No trending items right now.')).toBeInTheDocument())
    })

    it('marks a listing as watched when its id is in the watchlist (authenticated user)', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1' } })
      vi.mocked(getTrending).mockResolvedValue({
        items: [
          {
            id: 'l1', seller_id: 's1', category_id: null, title: 'Watch', description: null, brand: null,
            condition: 'used', condition_confidence: null, bidding_type: 'english',
            starting_price: 10, reserve_price: null, current_price: 10, min_increment: 1,
            status: 'active', is_draft: false, start_time: '2026-01-01', end_time: '2026-02-01',
            created_at: '2026-01-01', updated_at: '2026-01-01', images: [], seller: null, score: 1,
          },
        ],
        count: 1, type: 'global',
      })
      vi.mocked(getMyWatchlist).mockResolvedValue({ items: [], listing_ids: ['l1'] })
      renderBlock('TrendingAuctions')
      await waitFor(() => expect(screen.getByTitle('Remove from watchlist')).toBeInTheDocument())
    })

    it('does not fetch the watchlist at all for a logged-out visitor', async () => {
      renderBlock('TrendingAuctions')
      await waitFor(() => expect(getTrending).toHaveBeenCalled())
      expect(getMyWatchlist).not.toHaveBeenCalled()
    })
  })

  describe('FeatureGrid', () => {
    it('falls back to the Zap icon for an unrecognized icon key', () => {
      const { container } = renderBlock('FeatureGrid', {
        features: [{ icon: 'not-a-real-icon' as unknown as string, title: 'Mystery', text: 'x' }],
      })
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(screen.getByText('Mystery')).toBeInTheDocument()
    })
  })

  describe('TestimonialWall', () => {
    it('renders nothing when there are no featured testimonials', async () => {
      const { container } = renderBlock('TestimonialWall')
      await waitFor(() => expect(getPublicTestimonials).toHaveBeenCalled())
      expect(container.querySelector('section')).toBeNull()
    })

    it('renders testimonial cards when admin-featured testimonials exist', async () => {
      vi.mocked(getPublicTestimonials).mockResolvedValue([
        {
          id: 't1', user_id: 'u1', content: 'Great seller!', rating: 4, is_featured: true,
          created_at: '2026-01-01', user: { username: 'alice' },
        },
      ])
      renderBlock('TestimonialWall')
      await waitFor(() => expect(screen.getByText('"Great seller!"')).toBeInTheDocument())
      expect(screen.getByText('alice')).toBeInTheDocument()
    })
  })

  describe('PricingBlock', () => {
    it('shows "Sign Up Free" / "Get Premium Now" CTAs for a guest', () => {
      renderBlock('PricingBlock')
      expect(screen.getByText('Sign Up Free')).toBeInTheDocument()
      expect(screen.getByText('Get Premium Now')).toBeInTheDocument()
    })

    it('shows "Your Plan" + "Upgrade to Premium" for an authenticated free-tier user', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { subscription_tier: 'free' } })
      renderBlock('PricingBlock')
      expect(screen.getAllByText('Your Plan')).toHaveLength(1)
      expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument()
      expect(screen.queryByText('Sign Up Free')).toBeNull()
    })

    it('marks the premium tile as "Your Plan" (not "Most Popular") for a premium user, with no upgrade CTA', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { subscription_tier: 'premium' } })
      renderBlock('PricingBlock')
      expect(screen.queryByText('Most Popular')).toBeNull()
      expect(screen.queryByText('Upgrade to Premium')).toBeNull()
      expect(screen.queryByText('Get Premium Now')).toBeNull()
    })
  })

  describe('Banner', () => {
    it('renders when hideWhenLoggedIn is true and the visitor is logged out', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null })
      renderBlock('Banner', { hideWhenLoggedIn: true })
      expect(screen.getByText('Ready to start bidding?')).toBeInTheDocument()
    })

    it('renders nothing when hideWhenLoggedIn is true and the visitor is logged in', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1' } })
      const { container } = renderBlock('Banner', { hideWhenLoggedIn: true })
      expect(container.querySelector('section')).toBeNull()
    })

    it('still renders for a logged-in visitor when hideWhenLoggedIn is false', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1' } })
      renderBlock('Banner', { hideWhenLoggedIn: false })
      expect(screen.getByText('Ready to start bidding?')).toBeInTheDocument()
    })
  })
})
