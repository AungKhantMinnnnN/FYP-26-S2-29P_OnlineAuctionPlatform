import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, Grid3X3, List, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { getAuctions, getFormMetadata } from '../api/auctionsApi'
import type { AuctionListing } from '../api/auctionsApi'
import { getTrending } from '../api/recommendationsApi'
import type { TrendingListing } from '../api/recommendationsApi'
import { useAuth } from '../context/AuthContext'
import SearchBar from '../components/SearchBar'
import FilterPanel from '../components/FilterPanel'
import AuctionCard from '../components/AuctionCard'
import EmptyState from '../components/EmptyState'

export default function BrowseAuctionsPage() {
  const [mobileFilters, setMobileFilters] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const searchQuery = searchParams.get('q') || ''

  const { data: auctionsData, isLoading } = useQuery({
    queryKey: ['auctions', 'browse', page, searchQuery],
    queryFn: () => getAuctions({ page, size: 20, search: searchQuery || undefined })
  })

  // Real category names (listings only carry category_id).
  const { data: metadata } = useQuery({
    queryKey: ['form_metadata'],
    queryFn: getFormMetadata
  })
  const categoryMap = new Map((metadata?.categories ?? []).map(c => [c.id, c.name]))

  // Trending items — personalized when logged in, global otherwise.
  const {
    data: trendingData,
    isLoading: trendingLoading,
    isError: trendingError
  } = useQuery({
    queryKey: ['trending', user?.id ?? null],
    queryFn: () => getTrending({ user_id: user?.id, limit: 8 })
  })

  const mapToCardType = (listing: AuctionListing) => ({
    id: listing.id,
    title: listing.title,
    category: (listing.category_id && categoryMap.get(listing.category_id)) || 'Other',
    condition: listing.condition,
    currentBid: listing.current_price || 0,
    startingPrice: listing.starting_price || 0,
    endTime: new Date(listing.end_time),
    seller: { name: 'Seller', rating: 5.0 },
    bids: 0,
    watchers: 0,
    status: listing.status,
    description: listing.description || '',
    image: listing.images.length > 0 ? listing.images[0].image_url : undefined
  })

  // Trending payload is sparse (no image/condition/category) — fill unknowns neutrally.
  const mapTrendingToCard = (item: TrendingListing) => ({
    id: item.id,
    title: item.title,
    category: 'Trending',
    condition: '—',
    currentBid: item.current_price || 0,
    startingPrice: 0,
    endTime: item.end_time ? new Date(item.end_time) : new Date(),
    seller: { name: 'Seller', rating: 5.0 },
    bids: 0,
    watchers: 0,
    status: 'active',
    description: '',
    image: undefined
  })

  const auctionsList = auctionsData ? auctionsData.items.map(mapToCardType) : []
  const trendingList = trendingData ? trendingData.items.map(mapTrendingToCard) : []
  const totalItems = auctionsData?.total || 0
  const totalPages = auctionsData?.pages || 0

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Browse Auctions</h1>
          <p className="mt-1 text-sm text-slate-500">Find active auctions by category, condition, price, or time remaining.</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar className="w-full md:w-64" />
          <select className="rounded-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15">
            <option>Ending Soonest</option>
            <option>Newest</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Most Bids</option>
          </select>
          <button onClick={() => setMobileFilters(!mobileFilters)} className="md:hidden rounded-full border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm hover:bg-slate-50">
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      {!searchQuery && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
              <TrendingUp size={18} />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-950">Trending Now</h2>
          </div>
          {trendingLoading ? (
            <p className="text-sm text-slate-500">Loading trending items...</p>
          ) : trendingError ? (
            <p className="text-sm text-slate-500">Trending items are unavailable right now.</p>
          ) : trendingList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {trendingList.map(a => <AuctionCard key={a.id} auction={a} showWatchlist={false} />)}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No trending items yet.</p>
          )}
        </section>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 pt-16 bg-white/95 border-r border-slate-200/80 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur transform transition-transform duration-300 ease-in-out md:sticky md:top-20 md:z-auto md:h-[calc(100vh-6rem)] md:transform-none md:border-0 md:w-64 md:shrink-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none ${mobileFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="md:hidden flex items-center justify-between mb-4">
            <span className="font-semibold text-slate-950">Filters</span>
            <button onClick={() => setMobileFilters(false)} className="text-sm font-semibold text-accent-600">Close</button>
          </div>
          <div className="md:h-full md:overflow-y-auto md:pr-2">
            <FilterPanel />
          </div>
        </aside>
        {mobileFilters && <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden" onClick={() => setMobileFilters(false)} />}

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              {isLoading ? 'Loading...' : `${totalItems} results found`}
            </p>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-xl bg-accent-50 text-accent-700 ring-1 ring-accent-100"><Grid3X3 size={16} /></button>
              <button className="p-2 rounded-xl text-slate-400 transition-colors hover:bg-slate-100"><List size={16} /></button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-500">Loading auctions...</p>
            </div>
          ) : auctionsList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {auctionsList.map(a => <AuctionCard key={a.id} auction={a} />)}
            </div>
          ) : (
            <div className="mb-8">
              <EmptyState message="No auctions found on this page." actionText="Clear search" actionTo="/browse" />
            </div>
          )}

          {totalPages > 1 && !isLoading && (
            <div className="flex items-center justify-center gap-2 mt-auto pt-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
