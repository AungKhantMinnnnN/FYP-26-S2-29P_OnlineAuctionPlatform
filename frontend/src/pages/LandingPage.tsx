import { Link } from 'react-router-dom'
import { Search, Gavel, Zap, ChevronRight, Shield, TrendingUp, Play, Star, Check, BarChart3, BadgeCheck, Headphones } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getAuctions } from '../api/auctionsApi'
import type { AuctionListing } from '../api/auctionsApi'
import SearchBar from '../components/SearchBar'
import AuctionCard from '../components/AuctionCard'
import SectionHeader from '../components/SectionHeader'
import EmptyState from '../components/EmptyState'

// TODO: Replace with actual data from backend
const categories: string[] = []

// TODO: Replace with actual testimonials from backend
const testimonials = [
  {
    quote: 'The technical precision gives me the confidence to make split-second decisions on rare items I can\'t find anywhere else. Truly a game changer.',
    name: 'Eleanor Vance',
    role: 'Fine Art Collector',
    initials: 'EV'
  },
  {
    quote: 'The Verified Badge system ensures I\'m always dealing with serious buyers. Selling here is effortless and the UX is brilliant.',
    name: 'Marcus Reed',
    role: 'Verified Power Seller',
    initials: 'MR'
  },
  {
    quote: 'I\'ve tried other platforms, but the lack of limits on the Premium tier here is a game-changer for high-volume trading.',
    name: 'Sarah Jenkins',
    role: 'Luxury Watch Dealer',
    initials: 'SJ'
  }
]

export default function LandingPage() {
  const { data: auctionsData, isLoading } = useQuery({
    queryKey: ['auctions', 'landing'],
    queryFn: () => getAuctions({ size: 20 })
  })

  const mapToCardType = (listing: AuctionListing) => ({
    id: listing.id,
    title: listing.title,
    category: 'Other', // We'll need a category map later, fallback for now
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
  const featured = auctionsList.slice(0, 10)
  const trending = auctionsList.slice(10, 20)

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-12 space-y-20">
      {/* ── 1. Hero ── */}
      <section className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-2xl sm:text-[32px] font-bold text-slate-950 leading-[1.2] tracking-tight">
            The Premium Marketplace for Serious Collectors
          </h1>
          <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Discover, bid, and win exclusive items in a high-trust, high-velocity environment. Join a community where authenticity and speed matter.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <Link to="/register" className="bg-accent-600 text-white text-base font-medium px-8 py-3.5 rounded-lg hover:brightness-110 transition-all shadow-md">
            Start Bidding
          </Link>
          <Link to="/browse" className="bg-white border border-slate-300 text-slate-950 text-base font-medium px-8 py-3.5 rounded-lg hover:bg-slate-50 transition-all">
            View Auctions
          </Link>
        </div>
        {/* Video Placeholder */}
        <div className="w-full aspect-video bg-slate-200 rounded-xl border border-slate-300 mt-8 overflow-hidden relative shadow-lg flex items-center justify-center group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-300/50 to-slate-400/50" />
          <div className="z-10 bg-white/90 rounded-full p-5 shadow-xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
            <Play size={40} className="text-accent-600 fill-accent-600" />
          </div>
          <div className="absolute bottom-6 left-6 text-left z-10">
            <span className="bg-accent-600/90 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 inline-block shadow-md">Platform Tour</span>
            <h3 className="text-white font-semibold text-xl drop-shadow-md">How AuctionHub Works</h3>
          </div>
        </div>
      </section>

      {/* ── 2. Featured Auctions ── */}
      <section className="space-y-6">
        <SectionHeader title="Featured Auctions" actionText="View all" actionTo="/browse" />
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="h-40 bg-slate-100 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-16 rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-4 w-full rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-4 w-2/3 rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-8 w-full rounded-full bg-slate-100 animate-pulse mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.length > 0 ? featured.map(a => <AuctionCard key={a.id} auction={a} />) : <EmptyState message="No featured auctions yet." actionText="Browse all" actionTo="/browse" />}
          </div>
        )}
      </section>

      {/* ── 3. Trending Items ── */}
      <section className="space-y-6">
        <SectionHeader title="Trending Items" subtitle="Most bid-on auctions in the last 24 hours" actionText="See trends" actionTo="/browse" />
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="h-40 bg-slate-100 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-16 rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-4 w-full rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-4 w-2/3 rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-8 w-full rounded-full bg-slate-100 animate-pulse mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trending.length > 0 ? trending.map(a => <AuctionCard key={a.id} auction={a} />) : <EmptyState message="No trending items right now." actionText="Browse all" actionTo="/browse" />}
          </div>
        )}
      </section>

      {/* ── 4. Browse by Category ── */}
      {categories.length > 0 && (
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Popular Categories</h2>
              <p className="text-sm text-slate-500">Explore curated collections from verified sellers</p>
            </div>
            <Link to="/browse" className="text-accent-600 text-xs font-bold flex items-center gap-1 hover:underline">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(c => (
              <Link key={c} to={`/browse?cat=${c}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white aspect-[4/3] cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="text-xs font-bold">{c}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. Platform Advantages ── */}
      <section className="bg-slate-50 rounded-xl p-6 md:p-12 border border-slate-200">
        <div className="text-center mb-12">
          <h2 className="text-xl font-bold text-slate-950">The AuctionHub Advantage</h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto mt-2">Built for high-stakes trading with enterprise-grade technology.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-accent-600/10 rounded-full flex items-center justify-center text-accent-600">
              <Zap size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-950">Real-Time Sync</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Low-latency WebSocket infrastructure ensures every bid is recorded instantly. No lag, no missed opportunities.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-accent-600/10 rounded-full flex items-center justify-center text-accent-600">
              <Shield size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-950">Verified Listings</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Multi-step verification process guarantees item authenticity and seller credibility for every listing.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-accent-600/10 rounded-full flex items-center justify-center text-accent-600">
              <TrendingUp size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-950">AI Pricing Confidence</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Advanced machine learning models analyse historical data to provide real-time valuation insights.</p>
          </div>
        </div>
      </section>

      {/* ── 6. Testimonials ── */}
      <section className="space-y-10">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-950">Trusted by Professionals</h2>
          <p className="text-sm text-slate-500">See why thousands of collectors choose AuctionHub</p>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4 snap-x" style={{ scrollbarWidth: 'none' }}>
          {testimonials.map(t => (
            <div key={t.name} className="min-w-[320px] md:min-w-[400px] snap-center bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex-shrink-0">
              <div className="flex gap-1 text-accent-600 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-accent-600" />)}
              </div>
              <p className="text-sm text-slate-950 italic mb-8 leading-relaxed">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-600/15 flex items-center justify-center text-accent-600 font-bold text-sm">{t.initials}</div>
                <div>
                  <div className="text-xs font-bold text-slate-950">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. Subscription Plans ── */}
      <section className="space-y-10 pt-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-950">Transparent Pricing</h2>
          <p className="text-sm text-slate-500">Scale your collecting hobby or business with ease</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-950">Free</h3>
              <p className="text-sm text-slate-500 mt-1">For casual buyers and sellers starting out.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-950">$0</span>
                <span className="text-slate-500 text-sm">/month</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3 text-sm text-slate-950">
                <Check size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                Full marketplace browsing access
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-950">
                <Check size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                Up to 3 active bids per hour
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-950">
                <Check size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                Standard seller verification
              </li>
            </ul>
            <Link to="/register" className="w-full text-center bg-slate-100 border border-slate-200 text-slate-950 font-bold text-xs py-3 rounded-lg hover:bg-slate-200 transition-all">
              Sign Up Free
            </Link>
          </div>
          {/* Premium Tier */}
          <div className="bg-white border-2 border-accent-600 rounded-xl p-8 shadow-xl relative flex flex-col transform md:scale-105">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-accent-600 text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-md">Most Popular</span>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-bold text-accent-600">Premium</h3>
              <p className="text-sm text-slate-500 mt-1">For professional traders and collectors.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-950">$49</span>
                <span className="text-slate-500 text-sm">/month</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3 text-sm text-slate-950">
                <Star size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                <strong>No bidding or listing limits</strong>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-950">
                <BarChart3 size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                Advanced Collector Dashboard
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-950">
                <BadgeCheck size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                Priority Verification & Badging
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-950">
                <Headphones size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                24/7 VIP Concierge Support
              </li>
            </ul>
            <Link to="/register" className="w-full text-center bg-accent-600 text-white font-bold text-xs py-3 rounded-lg hover:brightness-110 transition-all shadow-md">
              Get Premium Now
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. CTA Banner ── */}
      <section className="bg-accent-600 rounded-xl p-10 md:p-14 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to start bidding?</h2>
        <p className="text-accent-100 text-sm mb-8 max-w-lg mx-auto leading-relaxed">Join thousands of local buyers and sellers. Registration is free and PDPA-compliant.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/register" className="inline-flex w-full sm:w-auto items-center justify-center bg-white text-accent-700 font-semibold text-sm px-7 py-3 rounded-lg shadow-md hover:bg-accent-50 transition-all">
            Register Now
          </Link>
          <Link to="/login" className="inline-flex w-full sm:w-auto items-center justify-center border border-white/30 text-white font-semibold text-sm px-7 py-3 rounded-lg hover:bg-white/10 transition-all">
            Log In
          </Link>
        </div>
      </section>
    </div>
  )
}
