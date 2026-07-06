import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, Eye, Gavel, Heart, Package, PlusCircle, Trophy } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import DataTable from '../components/DataTable'
import PrimaryButton from '../components/PrimaryButton'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { getMyListings, getSellerStats, type AuctionListing } from '../api/auctionsApi'
import { getMyBids, getMyPurchases, type BidHistoryItem, type PurchaseItem } from '../api/usersApi'

interface SellerStats {
  total_views: number
  total_watchlists: number
  total_sales: number
  total_revenue: number
}

type Tab = 'listings' | 'bids' | 'purchases'

export default function UserActivityPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('listings')
  const [listings, setListings] = useState<AuctionListing[]>([])
  const [bids, setBids] = useState<BidHistoryItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [stats, setStats] = useState<SellerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchAll = async () => {
      setIsLoading(true)
      try {
        const [listingsData, bidsData, purchasesData, statsData] = await Promise.all([
          getMyListings({ size: 100 }),
          getMyBids({ size: 100 }),
          getMyPurchases({ size: 100 }),
          getSellerStats(),
        ])
        setListings(listingsData.items)
        setBids(bidsData.items)
        setPurchases(purchasesData.items)
        setStats(statsData)
      } catch (err) {
        console.error('Failed to load activity', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [user])

  const activeListings = listings.filter(l => l.status.toLowerCase() === 'active')
  const wonBids = bids.filter(b => b.result === 'won')

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'listings', label: 'My Listings', count: listings.length },
    { id: 'bids', label: 'My Bids', count: bids.length },
    { id: 'purchases', label: 'My Purchases', count: purchases.length },
  ]

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
              Activity Hub
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Your Auction Activity</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Track your listings, monitor your bids, and review your purchases all in one place.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-950">Overview</p>
              <PrimaryButton to="/create-listing">
                <PlusCircle size={15} className="mr-1.5" /> Create Listing
              </PrimaryButton>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Listings', value: listings.length },
                { label: 'Bids', value: bids.length },
                { label: 'Wins', value: purchases.length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
                  <p className="text-2xl font-bold text-slate-950">{isLoading ? '—' : value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <DashboardStatCard title="Active Listings" value={isLoading ? '—' : activeListings.length} icon={Package} trend="Currently live" />
        <DashboardStatCard title="Total Bids" value={isLoading ? '—' : bids.length} icon={Gavel} trend="Bids placed" />
        <DashboardStatCard title="Total Wins" value={isLoading ? '—' : wonBids.length} icon={Trophy} trend="Auctions won" />
        <DashboardStatCard title="Item Views" value={isLoading ? '—' : (stats?.total_views ?? 0)} icon={Eye} trend="Across all listings" />
        <DashboardStatCard title="Watchlisted" value={isLoading ? '—' : (stats?.total_watchlists ?? 0)} icon={Heart} trend="By other users" />
        <DashboardStatCard title="Sales Revenue" value={isLoading ? '—' : `$${(stats?.total_revenue ?? 0).toFixed(2)}`} icon={DollarSign} trend="From completed sales" />
      </div>

      {/* Tabs + content */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-6 grid grid-cols-3 rounded-2xl bg-slate-100 p-1.5">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === id
                  ? 'bg-white text-accent-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
              <span
                className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === id ? 'bg-accent-100 text-accent-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isLoading ? '…' : count}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
            Loading your activity...
          </div>
        ) : activeTab === 'listings' ? (
          <DataTable
            headers={['Title', 'Status', 'Current Price', 'End Date', 'Actions']}
            rows={listings.map(l => [
              <span key={`t-${l.id}`} className="font-medium text-slate-900">
                {l.title}
              </span>,
              <StatusBadge key={`s-${l.id}`} status={l.status} />,
              `$${(l.current_price ?? l.starting_price ?? 0).toFixed(2)}`,
              l.end_time ? new Date(l.end_time).toLocaleDateString() : '—',
              <button
                key={`v-${l.id}`}
                onClick={() => navigate(`/auction/${l.id}`)}
                className="text-xs font-semibold text-accent-600 hover:underline"
              >
                View
              </button>,
            ])}
            emptyMessage="You haven't created any listings yet."
          />
        ) : activeTab === 'bids' ? (
          <DataTable
            headers={['Item', 'My Bid', 'Current Price', 'Result', 'Placed At']}
            rows={bids.map((b, i) => [
              <button
                key={`t-${i}`}
                onClick={() => navigate(`/auction/${b.listing_id}`)}
                className="text-left font-medium text-slate-900 hover:text-accent-600 hover:underline"
              >
                {b.listing_title}
              </button>,
              `$${b.my_highest_bid.toFixed(2)}`,
              `$${b.current_price.toFixed(2)}`,
              <StatusBadge key={`r-${i}`} status={b.result} />,
              new Date(b.placed_at).toLocaleDateString(),
            ])}
            emptyMessage="You haven't placed any bids yet."
          />
        ) : (
          <DataTable
            headers={['Item', 'Final Price', 'Date Won', 'Actions']}
            rows={purchases.map((p, i) => [
              <button
                key={`t-${i}`}
                onClick={() => navigate(`/auction/${p.listing_id}`)}
                className="text-left font-medium text-slate-900 hover:text-accent-600 hover:underline"
              >
                {p.listing_title}
              </button>,
              `$${p.final_price.toFixed(2)}`,
              new Date(p.ended_at).toLocaleDateString(),
              <button
                key={`v-${i}`}
                onClick={() => navigate(`/auction/${p.listing_id}`)}
                className="text-xs font-semibold text-accent-600 hover:underline"
              >
                View
              </button>,
            ])}
            emptyMessage="You haven't won any auctions yet."
          />
        )}
      </div>
    </div>
  )
}
