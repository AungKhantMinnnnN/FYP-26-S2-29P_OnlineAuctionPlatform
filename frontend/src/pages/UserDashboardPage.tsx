import { Link } from 'react-router-dom'
import { Gavel, Heart, Wallet, Trophy, Bell, Activity } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import SectionHeader from '../components/SectionHeader'
import AuctionCard from '../components/AuctionCard'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { currentUser, bidHistory, auctions, notifications, recentActivity } from '../data/mockData'

export default function UserDashboardPage() {
  const myBids = bidHistory.slice(0, 3)
  const watchlist = auctions.filter(a => [1,3,5].includes(a.id))
  const recommended = auctions.filter(a => a.category === 'Electronics').slice(0, 3)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back, {currentUser.fullName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard title="Active Bids" value={currentUser.bidsActive} icon={Gavel} trend="3 auctions" />
        <DashboardStatCard title="Watchlist" value={currentUser.watchlistCount} icon={Heart} trend="2 ending soon" />
        <DashboardStatCard title="Balance" value={`$${currentUser.balance.toFixed(2)}`} icon={Wallet} trend="Available" />
        <DashboardStatCard title="Wins" value={currentUser.wins} icon={Trophy} trend="This month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <SectionHeader title="My Bids" actionText="View history" actionTo="/bid-history" />
            <DataTable
              headers={['Item', 'Amount', 'Status', 'Result']}
              rows={myBids.map(b => [b.item, `$${b.amount.toFixed(2)}`, <StatusBadge key={b.id} status={b.status} />, b.result])}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <SectionHeader title="Recommended for You" subtitle="Based on your browsing history" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommended.map(a => <AuctionCard key={a.id} auction={a} showWatchlist={false} />)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <SectionHeader title="Trending Items" actionText="Browse all" actionTo="/browse" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {auctions.slice(0, 3).map(a => <AuctionCard key={a.id} auction={a} showWatchlist={false} />)}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-accent-600" />
              <h3 className="font-semibold text-gray-900">Notifications</h3>
            </div>
            <div className="space-y-3">
              {notifications.map(n => (
                <div key={n.id} className={`text-sm p-3 rounded-lg ${n.read ? 'bg-gray-50 text-gray-600' : 'bg-accent-50 text-accent-900'}`}>
                  <p className="font-medium">{n.text}</p>
                  <p className="text-xs opacity-75 mt-1">{n.time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-accent-600" />
              <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-accent-400" />
                  <div>
                    <p className="text-gray-800">{a.text}</p>
                    <p className="text-xs text-gray-500">{a.time}</p>
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