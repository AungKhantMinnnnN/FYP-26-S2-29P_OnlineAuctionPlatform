import { Link } from 'react-router-dom'
import { Search, Gavel, Zap, ChevronRight } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import AuctionCard from '../components/AuctionCard'
import SectionHeader from '../components/SectionHeader'
import { auctions, categories } from '../data/mockData'

export default function LandingPage() {
  const featured = auctions.slice(0, 4)
  const trending = auctions.slice(2, 6)

  return (
    <div className="overflow-hidden">
      <section className="relative border-b border-slate-200/80 bg-gradient-to-b from-white via-accent-50/30 to-slate-50 py-16 sm:py-24 dark:border-slate-800 dark:from-slate-950 dark:via-accent-950/20 dark:to-slate-950">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_35%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative mx-auto mb-5 inline-flex items-center rounded-full border border-accent-200 bg-white/80 px-3 py-1 text-xs font-semibold text-accent-700 shadow-sm backdrop-blur dark:border-accent-900/60 dark:bg-slate-950/70 dark:text-accent-300">
            Secure C2C auctions for Singapore sellers and buyers
          </div>
          <h1 className="relative text-4xl sm:text-6xl font-extrabold text-slate-950 tracking-tight mb-4 dark:text-slate-55 mb-4 dark:text-slate-50">
            Bid Smart. <span className="text-accent-600">Sell Easy.</span>
          </h1>
          <p className="relative text-lg text-slate-600 max-w-2xl mx-auto mb-8 dark:text-slate-300">
            Singapore's trusted C2C auction platform. Discover unique items, place incremental bids, and reach true market value — transparently.
          </p>
          <div className="relative max-w-xl mx-auto mb-8">
            <SearchBar />
          </div>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-lg">Get Started</Link>
            <Link to="/browse" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-slate-900">Browse Auctions</Link>
          </div>
        </div>
      </section>

      <section className="py-12 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Featured Auctions" actionText="View all" actionTo="/browse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map(a => <AuctionCard key={a.id} auction={a} />)}
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-y border-slate-200/80 dark:border-slate-800 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Trending Items" subtitle="Most bid-on auctions in the last 24 hours" actionText="See trends" actionTo="/browse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trending.map(a => <AuctionCard key={a.id} auction={a} />)}
          </div>
        </div>
      </section>

      <section className="py-12 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 mb-4 dark:text-slate-50">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map(c => (
              <Link key={c} to={`/browse?cat=${c}`} className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-accent-800">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{c}</span>
                <ChevronRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-600 dark:group-hover:text-accent-300" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-t border-slate-200/80 dark:border-slate-800 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-950 text-center mb-10 dark:text-slate-50">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-accent-50 flex items-center justify-center text-accent-600 dark:bg-accent-950/40 dark:text-accent-300">
                <Search size={20} />
              </div>
              <h3 className="font-semibold text-slate-950 mb-1 dark:text-slate-50">1. Browse & Watch</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Search categories, filter by condition, and add items to your watchlist.</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-accent-50 flex items-center justify-center text-accent-600 dark:bg-accent-950/40 dark:text-accent-300">
                <Gavel size={20} />
              </div>
              <h3 className="font-semibold text-slate-950 mb-1 dark:text-slate-50">2. Bid & Win</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Place incremental bids with real-time updates. Get outbid alerts instantly.</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-accent-50 flex items-center justify-center text-accent-600 dark:bg-accent-950/40 dark:text-accent-300">
                <Zap size={20} />
              </div>
              <h3 className="font-semibold text-slate-950 mb-1 dark:text-slate-50">3. Sell & Earn</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">List unused items, set reserve prices, and reach true market value.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gradient-to-r from-accent-700 to-accent-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Ready to start bidding?</h2>
          <p className="text-accent-100 text-sm mb-6 max-w-lg mx-auto">Join thousands of local buyers and sellers. Registration is free and PDPA-compliant.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-accent-700 shadow-sm transition-colors hover:bg-accent-50">Register Now</Link>
            <Link to="/login" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">Log In</Link>
          </div>
        </div>
      </section>
    </div>
  )
}