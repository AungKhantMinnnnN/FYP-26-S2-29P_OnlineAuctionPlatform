import { Link } from 'react-router-dom'
import { Image, Heart, Eye, Gavel } from 'lucide-react'
import CountdownBadge from './CountdownBadge'
import StatusBadge from './StatusBadge'

interface AuctionType {
  id: number | string
  title: string
  category: string
  condition: string
  currentBid: number
  startingPrice: number
  endTime: Date
  seller: { name: string; rating: number }
  bids: number
  watchers: number
  status: string
  description: string
  image?: string
}

interface AuctionCardProps {
  auction: AuctionType
  showWatchlist?: boolean
}

export default function AuctionCard({ auction, showWatchlist = true }: AuctionCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent-200 hover:shadow-soft">
      <div className="relative h-40 bg-gradient-to-br from-slate-100 via-slate-50 to-accent-50 flex items-center justify-center">
        {auction.image ? (
          <img src={auction.image} alt={auction.title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
        ) : (
          <Image size={34} className="text-slate-300 transition-transform group-hover:scale-110" />
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={auction.status} />
        </div>
        {showWatchlist && (
          <button className="absolute top-2 right-2 p-2 rounded-full bg-white/90 border border-slate-200 text-slate-500 shadow-sm backdrop-blur transition-colors hover:text-red-500 hover:border-red-200">
            <Heart size={16} />
          </button>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs font-medium text-slate-500 mb-1">{auction.category} • {auction.condition}</div>
        <Link to={`/auction/${auction.id}`} className="font-semibold text-slate-950 text-sm leading-snug hover:text-accent-600 mb-3 line-clamp-2">
          {auction.title}
        </Link>
        <div className="mt-auto">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-xs text-slate-500">Current bid</span>
            <span className="font-bold text-slate-950">${auction.currentBid.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <CountdownBadge endTime={auction.endTime} />
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Eye size={14} />
              {auction.watchers}
            </div>
          </div>
          <Link to={`/auction/${auction.id}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-700">
            <Gavel size={15} />
            View & Bid
          </Link>
        </div>
      </div>
    </div>
  )
}