import { Link } from 'react-router-dom'
import { Search, Gavel, Shield, Zap, TrendingUp, ChevronRight } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import AuctionCard from '../components/AuctionCard'
import SectionHeader from '../components/SectionHeader'
import { auctions, categories } from '../data/mockData'

export default function LandingPage() {
  const featured = auctions.slice(0, 4)
  const trending = auctions.slice(2, 6)

  return (
    <div>
      <section className="bg-white border-b border-gray-200 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Bid Smart. <span className="text-accent-600">Sell Easy.</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Singapore's trusted C2C auction platform. Discover unique items, place incremental bids, and reach true market value — transparently.
          </p>
          <div className="max-w-xl mx-auto mb-8">
            <SearchBar />
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link to="/register" className="px-5 py-2.5 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-700">Get Started</Link>
            <Link to="/browse" className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">Browse Auctions</Link>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Featured Auctions" actionText="View all" actionTo="/browse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map(a => <AuctionCard key={a.id} auction={a} />)}
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Trending Items" subtitle="Most bid-on auctions in the last 24 hours" actionText="See trends" actionTo="/browse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trending.map(a => <AuctionCard key={a.id} auction={a} />)}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map(c => (
              <Link key={c} to={`/browse?cat=${c}`} className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-accent-300 hover:shadow-sm transition-all">
                <span className="text-sm font-medium text-gray-700">{c}</span>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-50 flex items-center justify-center text-accent-600">
                <Search size={20} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">1. Browse & Watch</h3>
              <p className="text-sm text-gray-500">Search categories, filter by condition, and add items to your watchlist.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-50 flex items-center justify-center text-accent-600">
                <Gavel size={20} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">2. Bid & Win</h3>
              <p className="text-sm text-gray-500">Place incremental bids with real-time updates. Get outbid alerts instantly.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-50 flex items-center justify-center text-accent-600">
                <Zap size={20} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">3. Sell & Earn</h3>
              <p className="text-sm text-gray-500">List unused items, set reserve prices, and reach true market value.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-accent-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Ready to start bidding?</h2>
          <p className="text-accent-100 text-sm mb-6 max-w-lg mx-auto">Join thousands of local buyers and sellers. Registration is free and PDPA-compliant.</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/register" className="px-5 py-2.5 rounded-lg bg-white text-accent-700 text-sm font-medium hover:bg-accent-50">Register Now</Link>
            <Link to="/login" className="px-5 py-2.5 rounded-lg border border-accent-400 text-white text-sm font-medium hover:bg-accent-700">Log In</Link>
          </div>
        </div>
      </section>
    </div>
  )
}