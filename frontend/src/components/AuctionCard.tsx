import { Link } from 'react-router-dom'
import { Image, Heart, Eye } from 'lucide-react'
import CountdownBadge from './CountdownBadge'
import StatusBadge from './StatusBadge'

export default function AuctionCard({ auction, showWatchlist = true }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="relative h-40 bg-gray-100 flex items-center justify-center">
        <Image size={32} className="text-gray-300" />
        <div className="absolute top-2 left-2">
          <StatusBadge status={auction.status} />
        </div>
        {showWatchlist && (
          <button className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors">
            <Heart size={16} />
          </button>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs text-gray-500 mb-1">{auction.category} • {auction.condition}</div>
        <Link to={`/auction/${auction.id}`} className="font-semibold text-gray-900 text-sm leading-snug hover:text-accent-600 mb-2 line-clamp-2">
          {auction.title}
        </Link>
        <div className="mt-auto">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-xs text-gray-500">Current bid</span>
            <span className="font-bold text-gray-900">${auction.currentBid.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <CountdownBadge endTime={auction.endTime} />
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Eye size={14} />
              {auction.watchers}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}