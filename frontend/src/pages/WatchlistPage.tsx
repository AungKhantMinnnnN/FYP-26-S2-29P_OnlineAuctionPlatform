import { useMemo, useState } from 'react'
import { Heart, Search, Trash2 } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import AuctionCard from '../components/AuctionCard'
import EmptyState from '../components/EmptyState'
import SecondaryButton from '../components/SecondaryButton'
import { useAuth } from '../context/AuthContext'

// TODO: Replace with actual data from backend
const auctions = []
const WatchList = []

export default function WatchlistPage() {
  const { user } = useAuth()
  const userId = user?.id ?? '1'
  
  const initialIds = useMemo(() => {
    return WatchList.filter((item) => String(item.UserID) === String(userId)).map((item) => item.ListingID)
  }, [userId])
  
  const [watchIds, setWatchIds] = useState<number[]>(initialIds)
  const watchedAuctions = useMemo(() => {
    return auctions.filter((auction) => watchIds.includes(auction.id))
  }, [watchIds])

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Saved products</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">My Watchlist</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Track auctions you are interested in and jump back into bidding before they end.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <SecondaryButton to="/browse"><Search size={16} className="mr-2" /> Browse more products</SecondaryButton>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Heart size={22} /></span>
              <div>
                <p className="text-sm font-semibold text-slate-950">Watching</p>
                <p className="text-3xl font-bold text-slate-950">{watchedAuctions.length}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">Items remain local to this wireframe session and can be removed instantly.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <SectionHeader title="Saved Auctions" subtitle="Products you marked for quick access" actionText="Browse all" actionTo="/browse" />
        {watchedAuctions.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {watchedAuctions.map((auction) => (
              <div key={auction.id} className="space-y-3">
                <AuctionCard auction={auction} />
                <button onClick={() => setWatchIds((ids) => ids.filter((id) => id !== auction.id))} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-all hover:-translate-y-0.5 hover:bg-red-100">
                  <Trash2 size={15} /> Remove from watchlist
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Your watchlist is empty." actionText="Find auctions to watch" actionTo="/browse" />
        )}
      </div>
    </div>
  )
}
