import type { Config } from '@puckeditor/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ChevronRight, Zap, Shield, TrendingUp, Star, Check, BarChart3, BadgeCheck,
  Headphones, Mail, Play,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getFormMetadata } from '../api/auctionsApi'
import { getTrending } from '../api/recommendationsApi'
import type { TrendingListing } from '../api/recommendationsApi'
import { getPublicTestimonials } from '../api/supportApi'
import { getMarketingVideoUrl } from '../api/marketingApi'
import { getMyWatchlist } from '../api/usersApi'
import AuctionCard from '../components/AuctionCard'
import SectionHeader from '../components/SectionHeader'
import EmptyState from '../components/EmptyState'

// CMS link fields are free text from the page editor; restrict Link targets to same-site
// relative paths or https:// to block javascript:/data: URL injection.
const safeCtaLink = (link: string): string => {
  if (/^\/(?!\/)/.test(link)) return link // relative path, not protocol-relative "//"
  if (/^https:\/\//i.test(link)) return link
  return '/'
}

// Closed set of icons for the FeatureGrid picker — Puck has no icon-picker field type.
const FEATURE_ICONS = { zap: Zap, shield: Shield, trendingUp: TrendingUp, barChart: BarChart3 } as const
type FeatureIconKey = keyof typeof FEATURE_ICONS

// ── Hero ──────────────────────────────────────────────────────────
type HeroProps = {
  heading: string
  subheading: string
  primaryCtaLabel: string
  primaryCtaLink: string
  secondaryCtaLabel: string
  secondaryCtaLink: string
}

const Hero = ({ heading, subheading, primaryCtaLabel, primaryCtaLink, secondaryCtaLabel, secondaryCtaLink }: HeroProps) => {
  const { data: videoUrl } = useQuery({ queryKey: ['marketing-video'], queryFn: getMarketingVideoUrl })

  return (
    <section id="hero" className="flex flex-col items-center text-center space-y-6">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-2xl sm:text-[32px] font-bold text-slate-950 leading-[1.2] tracking-tight">{heading}</h1>
        <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">{subheading}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        <Link to={safeCtaLink(primaryCtaLink)} className="bg-accent-600 text-white text-base font-medium px-8 py-3.5 rounded-lg hover:brightness-110 transition-all shadow-md">
          {primaryCtaLabel}
        </Link>
        <Link to={safeCtaLink(secondaryCtaLink)} className="bg-white border border-slate-300 text-slate-950 text-base font-medium px-8 py-3.5 rounded-lg hover:bg-slate-50 transition-all">
          {secondaryCtaLabel}
        </Link>
      </div>
      <div className="w-full aspect-video bg-slate-200 rounded-xl border border-slate-300 mt-8 overflow-hidden relative shadow-lg flex items-center justify-center group">
        {videoUrl ? (
          <video src={videoUrl} controls autoPlay loop muted playsInline className="h-full w-full object-cover" />
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
      </div>
    </section>
  )
}

// ── Categories (dynamic, no editable props) ────────────────────────
const Categories = () => {
  const { data: metadata } = useQuery({ queryKey: ['form_metadata'], queryFn: getFormMetadata })
  const categories = (metadata?.categories ?? []).filter(c => c.is_active)

  return (
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
  )
}

// ── Trending auctions (dynamic, no editable props) ─────────────────
// Real bid-activity ranking, not just newest listings -- recommendations-engine's /recs/trending
// already excludes ended/removed/draft listings and carries the real status through.
const mapTrendingToCard = (item: TrendingListing) => ({
  id: item.id,
  title: item.title,
  category: 'Trending',
  condition: item.condition,
  currentBid: item.current_price || 0,
  startingPrice: item.starting_price || 0,
  endTime: item.end_time ? new Date(item.end_time) : new Date(),
  // recommendation-engine's TrendingListing doesn't carry rating data
  seller: { name: item.seller?.username || 'Seller', rating: null, ratingCount: 0 },
  bids: 0,
  watchers: 0,
  status: item.status,
  description: item.description || '',
  image: item.images?.find(i => i.is_primary)?.image_url ?? item.images?.[0]?.image_url ?? undefined,
})

const TrendingAuctions = () => {
  const { isAuthenticated } = useAuth()
  const { data: trendingData, isLoading } = useQuery({
    queryKey: ['trending', 'landing'],
    queryFn: () => getTrending({ limit: 10 }),
  })
  const { data: watchlistData } = useQuery({
    queryKey: ['users', 'me', 'watchlist', 'landing'],
    queryFn: getMyWatchlist,
    enabled: isAuthenticated,
  })
  const watchlistIds = new Set(watchlistData?.listing_ids ?? [])
  const trending = trendingData ? trendingData.items.map(mapTrendingToCard) : []

  return (
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
          {trending.length > 0
            ? trending.map(a => <AuctionCard key={a.id} auction={a} isWatched={watchlistIds.has(String(a.id))} />)
            : <EmptyState message="No trending items right now." actionText="Browse all" actionTo="/browse" />}
        </div>
      )}
    </section>
  )
}

// ── Feature grid ────────────────────────────────────────────────────
type FeatureGridProps = {
  heading: string
  subheading: string
  features: { icon: FeatureIconKey; title: string; text: string }[]
}

const FeatureGrid = ({ heading, subheading, features = [] }: FeatureGridProps) => (
  <section id="features" className="bg-slate-50 rounded-xl p-6 md:p-12 border border-slate-200">
    <div className="text-center mb-12">
      <h2 className="text-xl font-bold text-slate-950">{heading}</h2>
      <p className="text-sm text-slate-500 max-w-xl mx-auto mt-2">{subheading}</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
      {features.map((f, i) => {
        const Icon = FEATURE_ICONS[f.icon] ?? Zap
        return (
          <div key={i} className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-accent-600/10 rounded-full flex items-center justify-center text-accent-600">
              <Icon size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-950">{f.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{f.text}</p>
          </div>
        )
      })}
    </div>
  </section>
)

// ── Testimonial wall (dynamic, no editable props) ──────────────────
// Driven by admin-curated Testimonial records (TestimonialsSection.tsx's "Approve"
// toggle) -- every featured testimonial shows here, no cap, scrolling horizontally
// with a visible scrollbar instead of paging through a fixed set.
const TestimonialWall = () => {
  const { data: testimonialData } = useQuery({ queryKey: ['testimonials', 'public'], queryFn: getPublicTestimonials })
  const testimonials = testimonialData ?? []

  if (testimonials.length === 0) return null

  return (
    <section id="feedback" className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-950">What Our Community Says</h2>
        <p className="text-sm text-slate-500">Stories shared by buyers and sellers on the platform</p>
      </div>
      <div
        className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-color:theme(colors.slate.300)_theme(colors.slate.100)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:hover:bg-slate-400"
      >
        {testimonials.map(t => (
          <div key={t.id} className="min-w-[320px] md:min-w-[400px] snap-center bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-shrink-0 flex flex-col">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={15} className={i < t.rating ? 'fill-accent-600 text-accent-600' : 'text-slate-200 fill-slate-200'} />
              ))}
            </div>
            <p className="text-sm text-slate-950 italic leading-relaxed flex-1 mb-6">"{t.content}"</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-600/15 flex items-center justify-center text-accent-700 font-bold text-xs">
                {t.user?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-xs font-semibold text-slate-950">{t.user?.username ?? 'Anonymous'}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Pricing (static copy, auth-wired render logic) ─────────────────
type PricingProps = {
  heading: string
  subheading: string
  freeName: string
  freeDescription: string
  freePrice: string
  freeBullets: { text: string }[]
  premiumName: string
  premiumDescription: string
  premiumPrice: string
  premiumBullets: { text: string }[]
}

const PRICING_ICONS = [Star, BarChart3, BadgeCheck, Headphones]

const PricingBlock = ({
  heading, subheading, freeName, freeDescription, freePrice, freeBullets = [],
  premiumName, premiumDescription, premiumPrice, premiumBullets = [],
}: PricingProps) => {
  const { isAuthenticated, user } = useAuth()
  const isPremium = user?.subscription_tier === 'premium'
  const isFreeUser = isAuthenticated && !isPremium

  return (
    <section id="pricing" className="space-y-10 pt-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-950">{heading}</h2>
        <p className="text-sm text-slate-500">{subheading}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className={`bg-white rounded-xl p-8 shadow-sm flex flex-col relative ${isFreeUser ? 'border-2 border-slate-400' : 'border border-slate-200'}`}>
          {isFreeUser && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-slate-700 text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-md">Your Plan</span>
            </div>
          )}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-950">{freeName}</h3>
            <p className="text-sm text-slate-500 mt-1">{freeDescription}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-950">{freePrice}</span>
              <span className="text-slate-500 text-sm">/month</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8 flex-grow">
            {freeBullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-950">
                <Check size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                {b.text}
              </li>
            ))}
          </ul>
          {!isAuthenticated && (
            <Link to="/register" className="w-full text-center bg-slate-100 border border-slate-200 text-slate-950 font-bold text-xs py-3 rounded-lg hover:bg-slate-200 transition-all">
              Sign Up Free
            </Link>
          )}
        </div>

        <div className="bg-white border-2 border-accent-600 rounded-xl p-8 shadow-xl relative flex flex-col transform md:scale-105">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-accent-600 text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              {isPremium ? 'Your Plan' : 'Most Popular'}
            </span>
          </div>
          <div className="mb-8">
            <h3 className="text-xl font-bold text-accent-600">{premiumName}</h3>
            <p className="text-sm text-slate-500 mt-1">{premiumDescription}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-950">{premiumPrice}</span>
              <span className="text-slate-500 text-sm">/month</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8 flex-grow">
            {premiumBullets.map((b, i) => {
              const Icon = PRICING_ICONS[i % PRICING_ICONS.length]
              return (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-950">
                  <Icon size={18} className="text-accent-600 mt-0.5 flex-shrink-0" />
                  {b.text}
                </li>
              )
            })}
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
  )
}

// ── Contact ──────────────────────────────────────────────────────────
type ContactProps = { heading: string; subtext: string; email: string }

const ContactBlock = ({ heading, subtext, email }: ContactProps) => (
  <section id="contact" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-8 md:p-12">
    <div className="max-w-2xl mx-auto text-center space-y-4 mb-10">
      <h2 className="text-xl font-bold text-slate-950">{heading}</h2>
      <p className="text-sm text-slate-500">{subtext}</p>
    </div>
    <div className="max-w-3xl mx-auto text-center">
      <a href={`mailto:${email}`} className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-100 p-6 hover:border-accent-200 hover:bg-accent-50/30 transition-all">
        <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center text-accent-600 group-hover:bg-accent-100 transition-colors">
          <Mail size={22} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
          <p className="text-sm font-medium text-slate-950">{email}</p>
        </div>
      </a>
    </div>
  </section>
)

// ── CTA banner ───────────────────────────────────────────────────────
type BannerProps = {
  heading: string
  body: string
  ctaLabel: string
  ctaLink: string
  hideWhenLoggedIn: boolean
}

const Banner = ({ heading, body, ctaLabel, ctaLink, hideWhenLoggedIn }: BannerProps) => {
  const { isAuthenticated } = useAuth()
  if (hideWhenLoggedIn && isAuthenticated) return null

  return (
    <section className="bg-accent-600 rounded-xl p-10 md:p-14 text-center">
      <h2 className="text-2xl font-bold text-white mb-3">{heading}</h2>
      <p className="text-accent-100 text-sm mb-8 max-w-lg mx-auto leading-relaxed">{body}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to={safeCtaLink(ctaLink)} className="inline-flex w-full sm:w-auto items-center justify-center bg-white text-accent-700 font-semibold text-sm px-7 py-3 rounded-lg shadow-md hover:bg-accent-50 transition-all">
          {ctaLabel}
        </Link>
        <Link to="/login" className="inline-flex w-full sm:w-auto items-center justify-center border border-white/30 text-white font-semibold text-sm px-7 py-3 rounded-lg hover:bg-white/10 transition-all">
          Log In
        </Link>
      </div>
    </section>
  )
}

// ── Puck config ──────────────────────────────────────────────────────
type Props = {
  Hero: HeroProps
  Categories: Record<string, never>
  TrendingAuctions: Record<string, never>
  FeatureGrid: FeatureGridProps
  TestimonialWall: Record<string, never>
  PricingBlock: PricingProps
  ContactBlock: ContactProps
  Banner: BannerProps
}

export const puckConfig: Config<Props> = {
  root: {
    fields: {},
  },
  components: {
    Hero: {
      fields: {
        heading: { type: 'text' },
        subheading: { type: 'textarea' },
        primaryCtaLabel: { type: 'text' },
        primaryCtaLink: { type: 'text' },
        secondaryCtaLabel: { type: 'text' },
        secondaryCtaLink: { type: 'text' },
      },
      defaultProps: {
        heading: 'The Premium Marketplace for Serious Collectors',
        subheading: 'Discover, bid, and win exclusive items in a high-trust, high-velocity environment. Join a community where authenticity and speed matter.',
        primaryCtaLabel: 'Start Bidding',
        primaryCtaLink: '/register',
        secondaryCtaLabel: 'View Auctions',
        secondaryCtaLink: '/browse',
      },
      render: (props) => <Hero {...props} />,
    },
    Categories: {
      fields: {},
      defaultProps: {},
      render: () => <Categories />,
    },
    TrendingAuctions: {
      fields: {},
      defaultProps: {},
      render: () => <TrendingAuctions />,
    },
    FeatureGrid: {
      fields: {
        heading: { type: 'text' },
        subheading: { type: 'textarea' },
        features: {
          type: 'array',
          arrayFields: {
            icon: {
              type: 'select',
              options: [
                { label: 'Lightning', value: 'zap' },
                { label: 'Shield', value: 'shield' },
                { label: 'Trending Up', value: 'trendingUp' },
                { label: 'Bar Chart', value: 'barChart' },
              ],
            },
            title: { type: 'text' },
            text: { type: 'textarea' },
          },
        },
      },
      defaultProps: {
        heading: 'The AuctionHub Advantage',
        subheading: 'Built for high-stakes trading with enterprise-grade technology.',
        features: [
          { icon: 'zap', title: 'Real-Time Sync', text: 'Low-latency WebSocket infrastructure ensures every bid is recorded instantly. No lag, no missed opportunities.' },
          { icon: 'shield', title: 'Verified Listings', text: 'Multi-step verification process guarantees item authenticity and seller credibility for every listing.' },
          { icon: 'trendingUp', title: 'AI Pricing Confidence', text: 'Advanced machine learning models analyse historical data to provide real-time valuation insights.' },
        ],
      },
      render: (props) => <FeatureGrid {...props} />,
    },
    TestimonialWall: {
      fields: {},
      defaultProps: {},
      render: () => <TestimonialWall />,
    },
    PricingBlock: {
      fields: {
        heading: { type: 'text' },
        subheading: { type: 'text' },
        freeName: { type: 'text' },
        freeDescription: { type: 'text' },
        freePrice: { type: 'text' },
        freeBullets: { type: 'array', arrayFields: { text: { type: 'text' } } },
        premiumName: { type: 'text' },
        premiumDescription: { type: 'text' },
        premiumPrice: { type: 'text' },
        premiumBullets: { type: 'array', arrayFields: { text: { type: 'text' } } },
      },
      defaultProps: {
        heading: 'Transparent Pricing',
        subheading: 'Scale your collecting hobby or business with ease',
        freeName: 'Free',
        freeDescription: 'For casual buyers and sellers starting out.',
        freePrice: '$0',
        freeBullets: [
          { text: 'Full marketplace browsing access' },
          { text: 'Up to 10 active bids per hour' },
          { text: 'Standard seller verification' },
        ],
        premiumName: 'Premium',
        premiumDescription: 'For professional traders and collectors.',
        premiumPrice: '$49',
        premiumBullets: [
          { text: 'No bidding or listing limits' },
          { text: 'Advanced Collector Dashboard' },
          { text: 'Priority Verification & Badging' },
          { text: '24/7 VIP Concierge Support' },
        ],
      },
      render: (props) => <PricingBlock {...props} />,
    },
    ContactBlock: {
      fields: {
        heading: { type: 'text' },
        subtext: { type: 'textarea' },
        email: { type: 'text' },
      },
      defaultProps: {
        heading: 'Get in Touch',
        subtext: 'Have a question, dispute, or partnership enquiry? Our team is here to help.',
        email: 'support@auctionhub.com',
      },
      render: (props) => <ContactBlock {...props} />,
    },
    Banner: {
      fields: {
        heading: { type: 'text' },
        body: { type: 'textarea' },
        ctaLabel: { type: 'text' },
        ctaLink: { type: 'text' },
        hideWhenLoggedIn: { type: 'radio', options: [{ label: 'Yes', value: true }, { label: 'No', value: false }] },
      },
      defaultProps: {
        heading: 'Ready to start bidding?',
        body: 'Join thousands of local buyers and sellers. Registration is free and PDPA-compliant.',
        ctaLabel: 'Register Now',
        ctaLink: '/register',
        hideWhenLoggedIn: true,
      },
      render: (props) => <Banner {...props} />,
    },
  },
}
