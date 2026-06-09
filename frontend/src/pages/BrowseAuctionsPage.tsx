import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, Grid3X3, List, ChevronLeft, ChevronRight } from 'lucide-react'
import { getAuctions } from '../api/auctionsApi'
import type { AuctionListing } from '../api/auctionsApi'
import SearchBar from '../components/SearchBar'
import FilterPanel from '../components/FilterPanel'
import AuctionCard from '../components/AuctionCard'
import EmptyState from '../components/EmptyState'

export default function BrowseAuctionsPage() {
  const [mobileFilters, setMobileFilters] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  
  const page = parseInt(searchParams.get('page') || '1', 10)
  const searchQuery = searchParams.get('q') || ''
  
  const { data: auctionsData, isLoading } = useQuery({
    queryKey: ['auctions', 'browse', page, searchQuery],
    queryFn: () => getAuctions({ page, size: 20, search: searchQuery || undefined })
  })

  const mapToCardType = (listing: AuctionListing) => ({
    id: listing.id,
    title: listing.title,
    category: 'Other',
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

  const auctionsList = auctionsData ? auctionsData.items.map(mapToCardType) : []
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Browse Auctions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Find active auctions by category, condition, price, or time remaining.</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar className="w-full md:w-64" />
          <select className="rounded-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <option>Ending Soonest</option>
            <option>Newest</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Most Bids</option>
          </select>
          <button onClick={() => setMobileFilters(!mobileFilters)} className="md:hidden rounded-full border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className={`fixed bottom-0 left-0 top-16 z-40 w-72 bg-white/95 border-r border-slate-200/80 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur transform transition-transform duration-200 md:static md:transform-none md:border-0 md:p-0 md:w-64 md:block md:bg-transparent md:shadow-none dark:bg-slate-950/95 dark:border-slate-800 ${mobileFilters ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="md:hidden flex items-center justify-between mb-4">
            <span className="font-semibold text-slate-950 dark:text-slate-50">Filters</span>
            <button onClick={() => setMobileFilters(false)} className="text-sm font-semibold text-accent-600 dark:text-accent-300">Close</button>
          </div>
          <FilterPanel />
        </div>
        {mobileFilters && <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden" onClick={() => setMobileFilters(false)} />}

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isLoading ? 'Loading...' : `${totalItems} results found`}
            </p>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-xl bg-accent-50 text-accent-700 ring-1 ring-accent-100 dark:bg-accent-950/40 dark:text-accent-300 dark:ring-accent-900/60"><Grid3X3 size={16} /></button>
              <button className="p-2 rounded-xl text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"><List size={16} /></button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-500">Loading auctions...</p>
            </div>
          ) : auctionsList.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {auctionsList.map(a => <AuctionCard key={a.id} auction={a} />)}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-auto">
                  <button 
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Page {page} of {totalPages}
                  </span>
                  <button 
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState message="No auctions match your search." actionText="Clear search" actionTo="/browse" />
          )}
        </div>
      </div>
    </div>
  )
}