import { useParams, Link } from 'react-router-dom'
import { ChevronRight, Image, Heart, User, Clock, TrendingUp, Shield } from 'lucide-react'
import CountdownBadge from '../components/CountdownBadge'
import StatusBadge from '../components/StatusBadge'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import AuctionCard from '../components/AuctionCard'
import { auctions } from '../data/mockData'

export default function AuctionDetailPage() {
  const { id } = useParams()
  const auction = auctions.find(a => a.id === Number(id)) || auctions[0]
  const related = auctions.filter(a => a.id !== auction.id && a.category === auction.category).slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-gray-700">Home</Link>
        <ChevronRight size={14} />
        <Link to="/browse" className="hover:text-gray-700">Browse</Link>
        <ChevronRight size={14} />
        <Link to={`/browse?cat=${auction.category}`} className="hover:text-gray-700">{auction.category}</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 truncate max-w-xs">{auction.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <Image size={48} className="text-gray-300" />
            </div>
            <div className="flex gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                  <Image size={20} className="text-gray-300" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={auction.status} />
              <span className="text-xs text-gray-500">{auction.condition}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{auction.title}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <User size={16} />
              <span className="font-medium">{auction.seller.name}</span>
              <span className="text-gray-400">•</span>
              <span>{auction.seller.rating} ★</span>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{auction.description}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Bid History</h3>
            <div className="divide-y divide-gray-100">
              {auction.bidHistory.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">{b.bidder[0].toUpperCase()}</div>
                    <div>
                      <p className="font-medium text-gray-900">{b.bidder}</p>
                      <p className="text-xs text-gray-500">{b.time}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">${b.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-24">
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Current highest bid</p>
              <p className="text-3xl font-bold text-gray-900">${auction.currentBid.toFixed(2)}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Minimum next bid</p>
              <p className="text-lg font-semibold text-gray-900">${(auction.currentBid + auction.minIncrement).toFixed(2)}</p>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Time remaining</p>
              <CountdownBadge endTime={auction.endTime} className="text-sm px-3 py-1.5" />
            </div>

            <form className="space-y-3" onSubmit={e => e.preventDefault()}>
              <input type="number" placeholder="Enter bid amount" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-accent-500 focus:border-accent-500" />
              <PrimaryButton fullWidth>Place Bid</PrimaryButton>
            </form>

            <div className="flex items-center gap-2 mt-3">
              <SecondaryButton fullWidth onClick={() => {}}>
                <Heart size={16} className="mr-1" /> Watchlist
              </SecondaryButton>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
              <p className="flex items-center gap-1"><Shield size={12} /> Secure bidding with bid history logs</p>
              <p className="flex items-center gap-1"><TrendingUp size={12} /> {auction.bids} bids placed</p>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map(a => <AuctionCard key={a.id} auction={a} />)}
          </div>
        </div>
      )}
    </div>
  )
}