import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ChevronLeft, ChevronRight, Shield, TrendingUp, Play, Star, Check, BarChart3, BadgeCheck, Headphones, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { getAuctions, getFormMetadata } from '../api/auctionsApi'
import type { AuctionListing } from '../api/auctionsApi'
import { getPublicFeedback } from '../api/feedbackApi'
import { getMarketingVideoUrl, uploadMarketingVideo } from '../api/marketingApi'
import { getMyWatchlist } from '../api/usersApi'
import AuctionCard from '../components/AuctionCard'
import SectionHeader from '../components/SectionHeader'
import EmptyState from '../components/EmptyState'

export default function LandingPage() {
  const { isAuthenticated, user, role } = useAuth()
  const isPremium = user?.subscription_tier === 'premium'
  const isFreeUser = isAuthenticated && !isPremium

  const { data: videoUrl, refetch: refetchVideo } = useQuery({
    queryKey: ['marketing-video'],
    queryFn: getMarketingVideoUrl,
  })
  const [uploadingVideo, setUploadingVideo] = useState(false)

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingVideo(true)
    try {
      await uploadMarketingVideo(file)
      await refetchVideo()
    } catch {
      // silent — admin can retry the upload
    } finally {
      setUploadingVideo(false)
      event.target.value = ''
    }
  }
  const { data: auctionsData, isLoading } = useQuery({
    queryKey: ['auctions', 'landing'],
    queryFn: () => getAuctions({ size: 20 })
  })

  const { data: metadata } = useQuery({
    queryKey: ['form_metadata'],
    queryFn: getFormMetadata
  })
  const categories = (metadata?.categories ?? []).filter(c => c.is_active)

  const { data: watchlistData } = useQuery({
    queryKey: ['users', 'me', 'watchlist', 'landing'],
    queryFn: getMyWatchlist,
    enabled: isAuthenticated,
  })
  const watchlistIds = new Set(watchlistData?.listing_ids ?? [])

  const { data: feedbackData } = useQuery({
    queryKey: ['feedback', 'public'],
    queryFn: () => getPublicFeedback(8)
  })
  const feedbackItems = feedbackData ?? []

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
  const trending = auctionsList.slice(0, 10)

  const testimonialRef = useRef<HTMLDivElement>(null)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const scrollToTestimonial = (index: number) => {
    const el = testimonialRef.current
    if (!el) return
    const card = el.children[index] as HTMLElement
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' })
    setActiveTestimonial(index)
  }

  const handleTestimonialScroll = () => {
    const el = testimonialRef.current
    if (!el) return
    const card = el.children[0] as HTMLElement
    const cardWidth = card.clientWidth + 24 // gap-6 = 24px
    setActiveTestimonial(Math.round(el.scrollLeft / cardWidth))
  }

  const NAV_SECTIONS = [
    { label: 'Browse', href: '#categories' },
    { label: 'Trending', href: '#trending' },
    { label: 'Features', href: '#features' },
    { label: 'Feedback', href: '#feedback' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' },
  ]

  return (
    <>
      {/* Section nav — guests only; logged-in users have MarketplaceNav */}
      {!isAuthenticated && <nav className="sticky top-16 z-40 w-full border-b border-slate-200/60 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-center gap-8 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
            {NAV_SECTIONS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="shrink-0 pb-2 text-sm font-medium text-slate-600 transition-colors hover:text-accent-700"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </nav>}

    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-12 space-y-20">
      {/* ── 1. Hero ── */}
      <section id="hero" className="flex flex-col items-center text-center space-y-6">
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
        {/* Hero video */}
        <div className="w-full aspect-video bg-slate-200 rounded-xl border border-slate-300 mt-8 overflow-hidden relative shadow-lg flex items-center justify-center group">
          {videoUrl ? (
            <video src={videoUrl} controls className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-slate-300/50 to-slate-400/50" />
              <div className="z-10 bg-white/90 rounded-full p-5 shadow-xl flex items-center justify-center">
                <Play size={40} className="text-accent-600 fill-accent-600" />
              </div>
              <div className="absolute bottom-6 left-6 text-left z-10">
                <span className="bg-accent-600/90 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 inline-block shadow-md">Platform Tour</span>
                <h3 className="text-white font-semibold text-xl drop-shadow-md">How AuctionHub Works</h3>
              </div>
            </>
          )}

          {role === 'admin' && (
            <label className="absolute top-3 right-3 z-20 cursor-pointer rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-accent-700 shadow-md transition hover:bg-white">
              {uploadingVideo ? 'Uploading…' : videoUrl ? 'Replace video' : 'Upload video'}
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                className="hidden"
                disabled={uploadingVideo}
                onChange={handleVideoUpload}
              />
            </label>
          )}
        </div>
      </section>

      {/* ── 2. Browse by Category ── */}
      <section id="categories" className="space-y-6">
        <div className="flex items-end justify-between">
          <SectionHeader title="Browse by Category" subtitle="Explore curated collections across every niche" />
          <Link to="/browse" className="text-accent-600 text-xs font-bold flex items-center gap-1 hover:underline shrink-0">
            View All <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {!metadata ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200/80 bg-white px-6 py-5 flex items-center justify-center">
                <div className="h-3 w-28 rounded-full bg-slate-100 animate-pulse" />
              </div>
            ))
          ) : (
            categories.map(c => (
              <Link
                key={c.id}
                to={`/browse?category=${c.slug}`}
                className="group flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-sm text-center transition-all hover:-translate-y-1 hover:border-accent-200 hover:shadow-soft"
              >
                <span className="text-sm font-semibold text-slate-950 group-hover:text-accent-600 transition-colors">{c.name}</span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* ── 3. Trending Items ── */}
      <section id="trending" className="space-y-6">
        <SectionHeader title="Trending Items" subtitle="Most bid-on auctions in the last 24 hours" />
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
            {trending.length > 0 ? trending.map(a => <AuctionCard key={a.id} auction={a} isWatched={watchlistIds.has(String(a.id))} />) : <EmptyState message="No trending items right now." actionText="Browse all" actionTo="/browse" />}
          </div>
        )}
      </section>

      {/* ── 5. Platform Advantages ── */}
      <section id="features" className="bg-slate-50 rounded-xl p-6 md:p-12 border border-slate-200">
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

      {/* ── 6. Community Feedback ── */}
      {feedbackItems.length > 0 && (
      <section id="feedback" className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">What Our Community Says</h2>
            <p className="text-sm text-slate-500">Real feedback from buyers and sellers on the platform</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollToTestimonial(Math.max(0, activeTestimonial - 1))}
              disabled={activeTestimonial === 0}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-accent-200 hover:text-accent-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scrollToTestimonial(Math.min(feedbackItems.length - 1, activeTestimonial + 1))}
              disabled={activeTestimonial === feedbackItems.length - 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-accent-200 hover:text-accent-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={testimonialRef}
          onScroll={handleTestimonialScroll}
          className="flex gap-6 overflow-x-auto pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {feedbackItems.map(f => (
            <div key={f.id} className="min-w-[320px] md:min-w-[400px] snap-center bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-shrink-0 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} className={i < f.rating ? 'fill-accent-600 text-accent-600' : 'text-slate-200 fill-slate-200'} />
                  ))}
                </div>
                {f.feedback_type && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">
                    {f.feedback_type.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-950 italic leading-relaxed flex-1 mb-6">
                "{f.comment || 'No comment provided.'}"
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent-600/15 flex items-center justify-center text-accent-700 font-bold text-xs">
                    {f.reviewer?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-xs font-semibold text-slate-950">{f.reviewer?.username ?? 'Anonymous'}</span>
                </div>
                {f.listing && (
                  <span className="text-xs text-slate-400 truncate max-w-[140px]" title={f.listing.title}>
                    {f.listing.title}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2">
          {feedbackItems.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToTestimonial(i)}
              className={`rounded-full transition-all ${
                i === activeTestimonial
                  ? 'w-6 h-2 bg-accent-600'
                  : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </section>
      )}

      {/* ── 7. Subscription Plans ── */}
      <section id="pricing" className="space-y-10 pt-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-950">Transparent Pricing</h2>
          <p className="text-sm text-slate-500">Scale your collecting hobby or business with ease</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className={`bg-white rounded-xl p-8 shadow-sm flex flex-col relative ${isFreeUser ? 'border-2 border-slate-400' : 'border border-slate-200'}`}>
            {isFreeUser && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-slate-700 text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-md">Your Plan</span>
              </div>
            )}
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
                  Up to 10 active bids per hour
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-950">
                  <Check size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                  Standard seller verification
                </li>
              </ul>
              {!isAuthenticated && (
                <Link to="/register" className="w-full text-center bg-slate-100 border border-slate-200 text-slate-950 font-bold text-xs py-3 rounded-lg hover:bg-slate-200 transition-all">
                  Sign Up Free
                </Link>
              )}
          </div>

          {/* Premium Tier — always shown */}
          <div className="bg-white border-2 border-accent-600 rounded-xl p-8 shadow-xl relative flex flex-col transform md:scale-105">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-accent-600 text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                {isPremium ? 'Your Plan' : 'Most Popular'}
              </span>
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
            {!isAuthenticated && (
              <Link to="/register" className="w-full text-center bg-accent-600 text-white font-bold text-xs py-3 rounded-lg hover:brightness-110 transition-all shadow-md">
                Get Premium Now
              </Link>
            )}
            {isFreeUser && (
              <Link to="/profile" className="w-full text-center bg-accent-600 text-white font-bold text-xs py-3 rounded-lg hover:brightness-110 transition-all shadow-md">
                Upgrade to Premium
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── 8. Contact ── */}
      <section id="contact" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-8 md:p-12">
        <div className="max-w-2xl mx-auto text-center space-y-4 mb-10">
          <h2 className="text-xl font-bold text-slate-950">Get in Touch</h2>
          <p className="text-sm text-slate-500">Have a question, dispute, or partnership enquiry? Our team is here to help.</p>
        </div>
        <div className="max-w-3xl mx-auto text-center">
          <a href="mailto:support@auctionhub.com" className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-100 p-6 hover:border-accent-200 hover:bg-accent-50/30 transition-all">
            <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center text-accent-600 group-hover:bg-accent-100 transition-colors">
              <Mail size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm font-medium text-slate-950">support@auctionhub.com</p>
            </div>
          </a>
        </div>
      </section>

      {/* ── 9. CTA Banner ── */}
      {!isAuthenticated && (
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
      )}
    </div>
    </>
  )
}
