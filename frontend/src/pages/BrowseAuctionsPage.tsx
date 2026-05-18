import { useState } from 'react'
import { SlidersHorizontal, Grid3X3, List } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import FilterPanel from '../components/FilterPanel'
import AuctionCard from '../components/AuctionCard'
import EmptyState from '../components/EmptyState'
import { auctions } from '../data/mockData'

export default function BrowseAuctionsPage() {
  const [mobileFilters, setMobileFilters] = useState(false)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Browse Auctions</h1>
        <div className="flex items-center gap-3">
          <SearchBar className="w-full md:w-64" />
          <select className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-accent-500 focus:border-accent-500">
            <option>Ending Soonest</option>
            <option>Newest</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Most Bids</option>
          </select>
          <button onClick={() => setMobileFilters(!mobileFilters)} className="md:hidden p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 p-4 transform transition-transform duration-200 md:static md:transform-none md:border-0 md:p-0 md:w-64 md:block ${mobileFilters ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="md:hidden flex items-center justify-between mb-4">
            <span className="font-semibold">Filters</span>
            <button onClick={() => setMobileFilters(false)} className="text-sm text-accent-600">Close</button>
          </div>
          <FilterPanel />
        </div>
        {mobileFilters && <div className="fixed inset-0 z-40 bg-black/25 md:hidden" onClick={() => setMobileFilters(false)} />}

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{auctions.length} results found</p>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-md bg-gray-100 text-gray-700"><Grid3X3 size={16} /></button>
              <button className="p-1.5 rounded-md text-gray-400 hover:bg-gray-50"><List size={16} /></button>
            </div>
          </div>

          {auctions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {auctions.map(a => <AuctionCard key={a.id} auction={a} />)}
            </div>
          ) : (
            <EmptyState message="No auctions match your filters." actionText="Clear filters" actionTo="/browse" />
          )}
        </div>
      </div>
    </div>
  )
}