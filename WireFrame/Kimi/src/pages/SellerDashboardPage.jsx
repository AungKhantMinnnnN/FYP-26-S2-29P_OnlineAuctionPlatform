import { Link } from 'react-router-dom'
import { Package, DollarSign, BarChart3, Tag, PlusCircle } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import SectionHeader from '../components/SectionHeader'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import { sellerListings, soldItems, drafts } from '../data/mockData'

export default function SellerDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Seller Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage listings, track sales, and monitor performance.</p>
        </div>
        <PrimaryButton to="/create-listing"><PlusCircle size={16} className="mr-1" /> Create Listing</PrimaryButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard title="Active Listings" value={sellerListings.length} icon={Package} />
        <DashboardStatCard title="Total Sales" value={soldItems.length} icon={DollarSign} />
        <DashboardStatCard title="Revenue" value="$1,240.00" icon={BarChart3} />
        <DashboardStatCard title="Avg. Sell Price" value="$310.00" icon={Tag} />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <SectionHeader title="My Listings" actionText="View all" actionTo="/seller-dashboard" />
        <DataTable
          headers={['Title', 'Category', 'Current Bid', 'Bids', 'Status', 'Actions']}
          rows={sellerListings.map(l => [
            l.title,
            l.category,
            `$${l.currentBid.toFixed(2)}`,
            l.bids,
            <StatusBadge key={l.id} status={l.status} />,
            <div key={l.id} className="flex items-center gap-2">
              <button className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-300">Edit</button>
              <button className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400">Delete</button>
            </div>
          ])}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <SectionHeader title="Sold Items" />
          <DataTable
            headers={['Item', 'Final Price', 'Buyer', 'Date']}
            rows={soldItems.map(s => [s.title, `$${s.currentBid.toFixed(2)}`, 'buyer123', '10 May 2026'])}
            emptyMessage="No sales yet."
          />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <SectionHeader title="Drafts" actionText="Create new" actionTo="/create-listing" />
          <DataTable
            headers={['Title', 'Category', 'Last Updated', 'Actions']}
            rows={drafts.map(d => [
              d.title,
              d.category,
              d.updatedAt,
              <div key={d.id} className="flex items-center gap-2">
                <button className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-300">Edit</button>
                <button className="text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400">Delete</button>
              </div>
            ])}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="font-semibold text-slate-950 mb-3 dark:text-slate-50">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <SecondaryButton to="/create-listing">Create Listing</SecondaryButton>
          <SecondaryButton to="/bid-history">View Bid History</SecondaryButton>
          <SecondaryButton to="/profile">Update Profile</SecondaryButton>
        </div>
      </div>
    </div>
  )
}