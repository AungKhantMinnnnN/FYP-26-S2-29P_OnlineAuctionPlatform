import { useMemo, useState } from 'react'
import { Heart, Image, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import CountdownBadge from '../components/CountdownBadge'
import SectionHeader from '../components/SectionHeader'
import EmptyState from '../components/EmptyState'
import SecondaryButton from '../components/SecondaryButton'
import StatusBadge from '../components/StatusBadge'
import { listings, user_interactions, watchlist } from '../data/mockData'
import { useAuth } from '../context/AuthContext'

export default function WatchlistPage() {
  const { user } = useAuth()
  const userId = user?.id ?? 1
  const initialEntries = useMemo(() => watchlist.filter((item) => item.user_id === userId), [userId])
  const [entries, setEntries] = useState(initialEntries)
  const [interactions, setInteractions] = useState(user_interactions)
  const watchedListings = entries.map((entry) => ({ entry, listing: listings.find((listing) => listing.id === entry.listing_id) })).filter((item) => item.listing)

  const removeFromWatchlist = (entry) => {
    setEntries((items) => items.filter((item) => item.id !== entry.id))
    setInteractions((items) => [{ id: `local-${Date.now()}`, user_id: userId, listing_id: entry.listing_id, action: 'watchlist', occurred_at: 'just now' }, ...items])
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900/70">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">Saved products</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">My Watchlist</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Track auctions you are interested in and jump back into bidding before they end.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <SecondaryButton to="/browse"><Search size={16} className="mr-2" /> Browse more products</SecondaryButton>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"><Heart size={22} /></span>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Watching</p>
                <p className="text-3xl font-bold text-slate-950 dark:text-slate-50">{watchedListings.length}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Items remain local to this wireframe session and can be removed instantly.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <SectionHeader title="Saved Auctions" subtitle="Products you marked for quick access" actionText="Browse all" actionTo="/browse" />
        {watchedListings.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {watchedListings.map(({ entry, listing }) => (
              <div key={entry.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <Link to={`/auction/${listing.id}`} className="block">
                  <div className="aspect-video bg-gradient-to-br from-slate-100 via-slate-50 to-accent-50 flex items-center justify-center dark:from-slate-800 dark:via-slate-900 dark:to-accent-950/30">
                    <Image size={34} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3"><StatusBadge status={listing.status} /><span className="text-xs text-slate-500 dark:text-slate-400">Saved {entry.added_at}</span></div>
                    <h3 className="line-clamp-2 font-semibold text-slate-950 dark:text-slate-50">{listing.title}</h3>
                    <div className="flex items-end justify-between gap-3">
                      <div><p className="text-xs text-slate-500 dark:text-slate-400">Current Bid</p><p className="text-xl font-bold text-slate-950 dark:text-slate-50">${listing.current_price.toFixed(2)}</p></div>
                      {listing.end_time && <CountdownBadge endTime={listing.end_time} />}
                    </div>
                  </div>
                </Link>
                <button onClick={() => removeFromWatchlist(entry)} className="mb-4 ml-4 mr-4 inline-flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-all hover:-translate-y-0.5 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50">
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