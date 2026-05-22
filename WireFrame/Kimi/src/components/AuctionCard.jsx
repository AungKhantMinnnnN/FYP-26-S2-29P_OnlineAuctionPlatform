import { Link } from 'react-router-dom'
import { Image, Heart, Eye } from 'lucide-react'
import CountdownBadge from './CountdownBadge'
import StatusBadge from './StatusBadge'

export default function AuctionCard({ auction, showWatchlist = true }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent-200 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-accent-800">
      <div className="relative h-40 bg-gradient-to-br from-slate-100 via-slate-50 to-accent-50 flex items-center justify-center dark:from-slate-800 dark:via-slate-900 dark:to-accent-950/30">
        <Image size={34} className="text-slate-300 transition-transform group-hover:scale-110 dark:text-slate-600" />
        <div className="absolute top-2 left-2">
          <StatusBadge status={auction.status} />
        </div>
        {showWatchlist && (
          <button className="absolute top-2 right-2 p-2 rounded-full bg-white/90 border border-slate-200 text-slate-500 shadow-sm backdrop-blur transition-colors hover:text-red-500 hover:border-red-200 dark:bg-slate-950/80 dark:border-slate-700 dark:text-slate-400">
            <Heart size={16} />
          </button>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">{auction.category} • {auction.condition}</div>
        <Link to={`/auction/${auction.id}`} className="font-semibold text-slate-950 text-sm leading-snug hover:text-accent-600 mb-3 line-clamp-2 dark:text-slate-50 dark:hover:text-accent-300">
          {auction.title}
        </Link>
        <div className="mt-auto">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Current bid</span>
            <span className="font-bold text-slate-950 dark:text-slate-50">${auction.currentBid.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <CountdownBadge endTime={auction.endTime} />
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Eye size={14} />
              {auction.watchers}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}