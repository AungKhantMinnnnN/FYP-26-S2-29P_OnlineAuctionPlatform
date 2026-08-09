import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Gavel, Heart, Wallet, Trophy, Activity, Search, PlusCircle } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import SectionHeader from '../components/SectionHeader'
import AuctionCard from '../components/AuctionCard'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { getAuctions } from '../api/auctionsApi'
import type { AuctionListing } from '../api/auctionsApi'
import { getMyBids, getMyWatchlist } from '../api/usersApi'
import { getTrending } from '../api/recommendationsApi'
import type { TrendingListing } from '../api/recommendationsApi'

const mapListingToCard = (listing: AuctionListing) => ({
  id: listing.id,
  title: listing.title,
  category: 'Other',
  condition: listing.condition,
  currentBid: listing.current_price || 0,
  startingPrice: listing.starting_price || 0,
  endTime: new Date(listing.end_time),
  seller: {
    name: listing.seller?.username || 'Seller',
    rating: listing.seller?.rating_avg ?? null,
    ratingCount: listing.seller?.rating_count ?? 0,
  },
  bids: 0,
  watchers: 0,
  status: listing.status,
  description: listing.description || '',
  image: listing.images.length > 0 ? listing.images[0].image_url : undefined,
})

const mapTrendingToCard = (listing: TrendingListing) => ({
  id: listing.id,
  title: listing.title,
  category: 'Other',
  condition: listing.condition,
  currentBid: listing.current_price || 0,
  startingPrice: listing.starting_price || 0,
  endTime: listing.end_time ? new Date(listing.end_time) : new Date(),
  // recommendation-engine's TrendingListing.seller only carries id/username, no rating data
  seller: { name: listing.seller?.username || 'Seller', rating: null, ratingCount: 0 },
  bids: 0,
  watchers: 0,
  status: listing.status,
  description: listing.description || '',
  image: listing.images.length > 0 ? (listing.images[0].image_url ?? undefined) : undefined,
})

export default function UserDashboardPage() {
  const { user } = useAuth()

  const { data: liveAuctionsData } = useQuery({
    queryKey: ['auctions', 'dashboard-live'],
    queryFn: () => getAuctions({ status: 'active', size: 6 }),
  })

  const { data: bidsData } = useQuery({
    queryKey: ['users', 'me', 'bids', 'dashboard'],
    queryFn: () => getMyBids({ size: 50 }),
  })

  const { data: watchlistData } = useQuery({
    queryKey: ['users', 'me', 'watchlist', 'dashboard'],
    queryFn: getMyWatchlist,
  })

  const { data: recommendedData } = useQuery({
    queryKey: ['recs', 'trending', 'personal', user?.id],
    queryFn: () => getTrending({ limit: 3 }),
    enabled: !!user?.id,
  })

  const { data: trendingData } = useQuery({
    queryKey: ['recs', 'trending', 'global'],
    queryFn: () => getTrending({ limit: 3 }),
  })

  const watchlistIds = new Set(watchlistData?.listing_ids ?? [])
  const liveAuctions = (liveAuctionsData?.items ?? []).map(mapListingToCard)
  const bids = bidsData?.items ?? []
  const recentBids = bids.slice(0, 3)
  const activeBidsCount = bids.filter(b => b.result === 'leading' || b.result === 'active').length
  const winsCount = bids.filter(b => b.result === 'won').length
  const watchlistItems = watchlistData?.items ?? []
  const recommended = (recommendedData?.items ?? []).map(mapTrendingToCard)
  const trending = (trendingData?.items ?? []).map(mapTrendingToCard)

  const balance = user?.balance ?? 0
  const fullName = user?.username || user?.email || 'User'
  const nextBid = liveAuctions[0]

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">Marketplace user</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Find products and place bids</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Welcome back, {fullName}. Your main flow is browsing active auctions, checking product details, and bidding. Selling tools are available in the same user account from the navigation bar.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link to="/browse" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-accent-700">
                <Search size={16} /> Browse Products
              </Link>
              <Link to="/create-listing" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:text-accent-700">
                <PlusCircle size={16} /> Sell an Item
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">Next bid starts from</p>
            <p className="mt-2 text-4xl font-bold text-accent-700">${nextBid ? nextBid.currentBid.toFixed(2) : '0.00'}</p>
            <p className="mt-1 text-sm text-slate-500">{nextBid ? nextBid.title : 'No active auctions'}</p>
            {nextBid && (
              <Link to={`/auction/${nextBid.id}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5">
                <Gavel size={16} /> Bid Now
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard title="Active Bids" value={activeBidsCount} icon={Gavel} trend={`${activeBidsCount} auctions`} />
        <DashboardStatCard title="Watchlist" value={watchlistItems.length} icon={Heart} trend={`${watchlistItems.length} saved`} />
        <DashboardStatCard title="Balance" value={`$${balance.toFixed(2)}`} icon={Wallet} trend="Available" />
        <DashboardStatCard title="Wins" value={winsCount} icon={Trophy} trend="All time" />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <SectionHeader title="Live Products to Bid On" subtitle="Active auctions are the main marketplace experience" actionText="Browse all" actionTo="/browse" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {liveAuctions.length > 0
            ? liveAuctions.map(a => <AuctionCard key={a.id} auction={a} isWatched={watchlistIds.has(String(a.id))} />)
            : <EmptyState message="No active auctions right now." actionText="Browse auctions" actionTo="/browse" />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <SectionHeader title="My Bids" actionText="View history" actionTo="/activity" />
            <DataTable
              headers={['Item', 'Your Bid', 'Current Price', 'Status']}
              rows={recentBids.map(b => [
                b.listing_title,
                `$${b.my_highest_bid.toFixed(2)}`,
                `$${b.current_price.toFixed(2)}`,
                <StatusBadge key={b.listing_id} status={b.result} />,
              ])}
              emptyMessage="You haven't placed any bids yet."
            />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <SectionHeader title="Recommended for You" subtitle="Based on your browsing history" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommended.length > 0
                ? recommended.map(a => <AuctionCard key={a.id} auction={a} isWatched={watchlistIds.has(String(a.id))} />)
                : <EmptyState message="No recommendations yet." actionText="Browse auctions" actionTo="/browse" />}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <SectionHeader title="Trending Items" actionText="Browse all" actionTo="/browse" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {trending.length > 0
                ? trending.map(a => <AuctionCard key={a.id} auction={a} isWatched={watchlistIds.has(String(a.id))} />)
                : <EmptyState message="Nothing trending yet." actionText="Browse auctions" actionTo="/browse" />}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><Heart size={18} /></span>
                <h3 className="font-semibold text-slate-950">Watchlist</h3>
              </div>
              <Link to="/watchlist" className="text-xs font-semibold text-accent-700 hover:text-accent-800">View all</Link>
            </div>
            {watchlistItems.length === 0 ? (
              <p className="text-sm text-slate-400">You haven't saved any auctions yet.</p>
            ) : (
              <div className="space-y-3">
                {watchlistItems.slice(0, 3).map(w => (
                  <Link
                    key={w.watchlist_id}
                    to={`/auction/${w.listing_id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm hover:border-accent-200"
                  >
                    <span className="font-medium text-slate-800 line-clamp-1">{w.listing.title}</span>
                    <span className="shrink-0 font-bold text-slate-950">${w.listing.current_price.toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><Activity size={18} /></span>
              <h3 className="font-semibold text-slate-950">Recent Activity</h3>
            </div>
            {recentBids.length === 0 ? (
              <p className="text-sm text-slate-400">No recent bidding activity.</p>
            ) : (
              <div className="space-y-3">
                {recentBids.map(b => (
                  <div key={b.listing_id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-accent-400" />
                    <div>
                      <p className="text-slate-800">Bid ${b.my_highest_bid.toFixed(2)} on {b.listing_title}</p>
                      <p className="text-xs text-slate-500">{new Date(b.placed_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
