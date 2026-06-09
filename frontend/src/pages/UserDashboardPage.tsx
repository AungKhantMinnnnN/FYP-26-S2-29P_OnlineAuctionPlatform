import { Link } from 'react-router-dom'
import { Gavel, Heart, Wallet, Trophy, Bell, Activity, Search, PlusCircle } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import SectionHeader from '../components/SectionHeader'
import AuctionCard from '../components/AuctionCard'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'

// TODO: Replace with actual data from backend
const bidHistory: any[] = []
const auctions: any[] = []
const notifications: any[] = []
const recentActivity: any[] = []

export default function UserDashboardPage() {
  const { user } = useAuth()
  
  const myBids = bidHistory.slice(0, 3)
  const recommended = auctions.filter(a => a.category === 'Electronics').slice(0, 3)
  const liveAuctions = auctions.filter(a => a.status === 'active').slice(0, 6)
  
  const balance = user?.balance ?? 0
  const fullName = user?.username || user?.email || 'User'

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900/70">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">Marketplace user</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Find products and place bids</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Welcome back, {fullName}. Your main flow is browsing active auctions, checking product details, and bidding. Selling tools are available in the same user account from the navigation bar.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link to="/browse" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-accent-700 dark:bg-accent-500 dark:text-slate-950 dark:hover:bg-accent-400">
                <Search size={16} /> Browse Products
              </Link>
              <Link to="/create-listing" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:text-accent-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-accent-800 dark:hover:text-accent-300">
                <PlusCircle size={16} /> Sell an Item
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Next bid starts from</p>
            <p className="mt-2 text-4xl font-bold text-accent-700 dark:text-accent-300">${liveAuctions.length > 0 ? (liveAuctions[0].currentBid + liveAuctions[0].minIncrement).toFixed(2) : '0.00'}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{liveAuctions.length > 0 ? liveAuctions[0].title : 'No active auctions'}</p>
            {liveAuctions.length > 0 && (
              <Link to={`/auction/${liveAuctions[0].id}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 dark:bg-slate-100 dark:text-slate-950">
                <Gavel size={16} /> Bid Now
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard title="Active Bids" value={0} icon={Gavel} trend="0 auctions" />
        <DashboardStatCard title="Watchlist" value={0} icon={Heart} trend="0 ending soon" />
        <DashboardStatCard title="Balance" value={`$${balance.toFixed(2)}`} icon={Wallet} trend="Available" />
        <DashboardStatCard title="Wins" value={0} icon={Trophy} trend="This month" />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <SectionHeader title="Live Products to Bid On" subtitle="Active auctions are the main marketplace experience" actionText="Browse all" actionTo="/browse" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {liveAuctions.map(a => <AuctionCard key={a.id} auction={a} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <SectionHeader title="My Bids" actionText="View history" actionTo="/bid-history" />
            <DataTable
              headers={['Item', 'Amount', 'Status', 'Result']}
              rows={myBids.map(b => [b.item, `$${b.amount.toFixed(2)}`, <StatusBadge key={b.id} status={b.status} />, b.result])}
            />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <SectionHeader title="Recommended for You" subtitle="Based on your browsing history" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommended.map(a => <AuctionCard key={a.id} auction={a} showWatchlist={false} />)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <SectionHeader title="Trending Items" actionText="Browse all" actionTo="/browse" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {auctions.slice(0, 3).map(a => <AuctionCard key={a.id} auction={a} showWatchlist={false} />)}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300"><Bell size={18} /></span>
              <h3 className="font-semibold text-slate-950 dark:text-slate-50">Notifications</h3>
            </div>
            <div className="space-y-3">
              {notifications.map(n => (
                <div key={n.id} className={`text-sm p-3 rounded-xl border ${n.read ? 'border-slate-200/80 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400' : 'border-accent-200 bg-accent-50 text-accent-900 dark:border-accent-900/60 dark:bg-accent-950/40 dark:text-accent-200'}`}>
                  <p className="font-medium">{n.text}</p>
                  <p className="text-xs opacity-75 mt-1">{n.time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300"><Activity size={18} /></span>
              <h3 className="font-semibold text-slate-950 dark:text-slate-50">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-accent-400" />
                  <div>
                    <p className="text-slate-800 dark:text-slate-200">{a.text}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}