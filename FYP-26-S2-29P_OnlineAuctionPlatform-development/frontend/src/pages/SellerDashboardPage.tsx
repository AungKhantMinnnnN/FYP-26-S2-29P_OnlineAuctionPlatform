import { useState, useEffect } from 'react'
import { Package, DollarSign, BarChart3, Tag, PlusCircle } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import SectionHeader from '../components/SectionHeader'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import { getMyListings, type AuctionListing } from '../api/auctionsApi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SellerDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listings, setListings] = useState<AuctionListing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await getMyListings({ size: 100 })
        setListings(data.items)
      } catch (err) {
        console.error("Failed to fetch listings", err)
      } finally {
        setIsLoading(false)
      }
    }
    if (user) fetchListings()
  }, [user])

  const activeListings = listings.filter(l => l.status.toLowerCase() === 'active')
  const soldItems = listings.filter(l => ['ended', 'sold', 'completed'].includes(l.status.toLowerCase()))
  const drafts = listings.filter(l => l.status.toLowerCase() === 'draft')

  const totalSales = soldItems.length
  const revenue = soldItems.reduce((acc, curr) => acc + (curr.current_price ?? curr.starting_price ?? 0), 0)
  const avgSellPrice = totalSales > 0 ? revenue / totalSales : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Seller Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage listings, track sales, and monitor performance.</p>
        </div>
        <PrimaryButton to="/create-listing">
          <PlusCircle size={16} className="mr-1" /> Create Listing
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard title="Active Listings" value={activeListings.length} icon={Package} />
        <DashboardStatCard title="Total Sales" value={totalSales} icon={DollarSign} />
        <DashboardStatCard title="Revenue" value={`$${revenue.toFixed(2)}`} icon={BarChart3} />
        <DashboardStatCard title="Avg. Sell Price" value={`$${avgSellPrice.toFixed(2)}`} icon={Tag} />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <SectionHeader title="My Listings" actionText="View all" actionTo="/seller-listings" />
        {isLoading ? (
          <div className="text-center text-slate-500 py-8 animate-pulse">Loading listings...</div>
        ) : (
          <DataTable
            headers={['Title', 'Category', 'Current Bid', 'Bids', 'Status', 'Actions']}
            rows={activeListings.slice(0, 5).map(l => [
              <span key={`title-${l.id}`} className="font-medium">{l.title}</span>,
              l.category_id || '-',
              `$${(l.current_price ?? l.starting_price ?? 0).toFixed(2)}`,
              '-', // bids count not directly available yet
              <StatusBadge key={l.id} status={l.status} />,
              <div key={`actions-${l.id}`} className="flex items-center gap-2">
                <button onClick={() => navigate(`/auction/${l.id}`)} className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-300">View</button>
                <button onClick={() => navigate(`/edit-listing/${l.id}`)} className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-300">Edit</button>
              </div>
            ])}
            emptyMessage="No active listings."
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <SectionHeader title="Sold Items" />
          {isLoading ? (
             <div className="text-center text-slate-500 py-8 animate-pulse">Loading...</div>
          ) : (
            <DataTable
              headers={['Item', 'Final Price', 'Date']}
              rows={soldItems.slice(0, 5).map(s => [
                s.title, 
                `$${(s.current_price ?? s.starting_price ?? 0).toFixed(2)}`, 
                new Date(s.end_time).toLocaleDateString()
              ])}
              emptyMessage="No sales yet."
            />
          )}
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <SectionHeader title="Drafts" actionText="Create new" actionTo="/create-listing" />
          {isLoading ? (
             <div className="text-center text-slate-500 py-8 animate-pulse">Loading...</div>
          ) : (
            <DataTable
              headers={['Title', 'Last Updated', 'Actions']}
              rows={drafts.slice(0, 5).map(d => [
                d.title,
                new Date(d.updated_at).toLocaleDateString(),
                <div key={`actions-${d.id}`} className="flex items-center gap-2">
                  <button onClick={() => navigate(`/edit-listing/${d.id}`)} className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-300">Edit</button>
                </div>
              ])}
              emptyMessage="No drafts found."
            />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="font-semibold text-slate-950 mb-3 dark:text-slate-50">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <SecondaryButton to="/create-listing">Create Listing</SecondaryButton>
          <SecondaryButton to="/seller-listings">View All Listings</SecondaryButton>
          <SecondaryButton to="/profile">Update Profile</SecondaryButton>
        </div>
      </div>
    </div>
  )
}