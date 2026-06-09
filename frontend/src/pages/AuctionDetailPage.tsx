import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, Image, Heart, User, TrendingUp, Shield, Wallet } from 'lucide-react'
import CountdownBadge from '../components/CountdownBadge'
import StatusBadge from '../components/StatusBadge'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import AuctionCard from '../components/AuctionCard'
import { useAuth } from '../context/AuthContext'

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  // TODO: Replace with actual backend fetch
  const auction: any = null

  
  const { user, adjustBalance } = useAuth()
  const [currentBid, setCurrentBid] = useState(auction?.currentBid || 0)
  const [bidsPlaced, setBidsPlaced] = useState(auction?.bids || 0)
  const [bidHistory, setBidHistory] = useState<any[]>(auction?.bidHistory || [])
  const [bidAmount, setBidAmount] = useState('')
  const [bidMessage, setBidMessage] = useState('')
  const [bidError, setBidError] = useState('')
  const [watched, setWatched] = useState(false)
  
  // TODO: Replace with actual backend fetch
  const related: any[] = []
  const minimumBid = useMemo(() => auction ? Number((currentBid + auction.minIncrement).toFixed(2)) : 0, [auction, currentBid])
  const balance = user?.balance ?? 0

  if (!auction) {
    return <div className="text-center py-20 text-slate-500">Loading auction details or not found...</div>
  }

  const handleBid = (e: React.FormEvent) => {
    e.preventDefault()
    setBidMessage('')
    setBidError('')
    const amount = Number(bidAmount)
    
    if (!user) {
      setBidError('Please log in before placing a bid.')
      return
    }
    if (auction.status !== 'active') {
      setBidError('This auction is no longer active.')
      return
    }
    if (!amount || amount < minimumBid) {
      setBidError(`Bid must be at least $${minimumBid.toFixed(2)}.`)
      return
    }
    if (amount > balance) {
      setBidError('Insufficient Balance. Please top up your wallet first.')
      return
    }

    setCurrentBid(amount)
    setBidsPlaced((count) => count + 1)
    setBidHistory((history) => [
      { bidder: user.username || user.email, amount, time: 'just now' },
      ...history
    ])
    adjustBalance(-amount)
    setBidAmount('')
    setBidMessage(`Bid placed successfully. $${amount.toFixed(2)} has been held from your Balance.`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 dark:text-slate-400">
        <Link to="/" className="hover:text-slate-700 dark:hover:text-slate-200">Home</Link>
        <ChevronRight size={14} />
        <Link to="/browse" className="hover:text-slate-700 dark:hover:text-slate-200">Browse</Link>
        <ChevronRight size={14} />
        <Link to={`/browse?cat=${auction.category}`} className="hover:text-slate-700 dark:hover:text-slate-200">{auction.category}</Link>
        <ChevronRight size={14} />
        <span className="text-slate-950 truncate max-w-xs dark:text-slate-100">{auction.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-accent-50 flex items-center justify-center mb-3 dark:from-slate-800 dark:via-slate-900 dark:to-accent-950/30">
              <Image size={48} className="text-slate-300 dark:text-slate-600" />
            </div>
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <Image size={20} className="text-slate-300 dark:text-slate-600" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={auction.status} />
              <span className="text-xs text-slate-500 dark:text-slate-400">{auction.condition}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 mb-3 dark:text-slate-50">{auction.title}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 dark:text-slate-300">
              <User size={16} />
              <span className="font-medium">{auction.seller.name}</span>
              <span className="text-slate-400">•</span>
              <span>{auction.seller.rating} ★</span>
            </div>
            <p className="text-slate-700 text-sm leading-relaxed dark:text-slate-300">{auction.description}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <h3 className="font-semibold text-slate-950 mb-3 dark:text-slate-50">Bid History</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {bidHistory.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-50 flex items-center justify-center text-accent-700 text-xs font-bold dark:bg-accent-950/40 dark:text-accent-300">
                      {b.bidder[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-950 dark:text-slate-50">{b.bidder}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{b.time}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-slate-950 dark:text-slate-50">${b.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sticky top-24 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-1 dark:text-slate-400">Current highest bid</p>
              <p className="text-3xl font-bold text-slate-950 dark:text-slate-50">${currentBid.toFixed(2)}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-1 dark:text-slate-400">Minimum next bid</p>
              <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                ${minimumBid.toFixed(2)}
              </p>
            </div>
            {user && (
              <div className="mb-4 rounded-2xl bg-accent-50 p-3 text-sm text-accent-800 ring-1 ring-accent-100 dark:bg-accent-950/30 dark:text-accent-200 dark:ring-accent-900/50">
                <p className="flex items-center justify-between font-semibold">
                  <span className="inline-flex items-center gap-2"><Wallet size={15} /> Your Balance</span>
                  <span>${balance.toFixed(2)}</span>
                </p>
              </div>
            )}
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-1 dark:text-slate-400">Time remaining</p>
              <CountdownBadge endTime={auction.endTime} className="text-sm px-3 py-1.5" />
            </div>

            <form className="space-y-3" onSubmit={handleBid}>
              <input
                type="number"
                min={minimumBid}
                step={auction.minIncrement}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Enter at least $${minimumBid.toFixed(2)}`}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
              {bidError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">{bidError}</p>}
              {bidMessage && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{bidMessage}</p>}
              <PrimaryButton fullWidth type="submit">Place Bid</PrimaryButton>
            </form>

            <div className="flex items-center gap-2 mt-3">
              <SecondaryButton fullWidth onClick={() => setWatched(!watched)}>
                <Heart size={16} className={`mr-1 ${watched ? 'fill-red-500 text-red-500' : ''}`} /> {watched ? 'Added to Watchlist' : 'Watchlist'}
              </SecondaryButton>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1 dark:border-slate-800 dark:text-slate-400">
              <p className="flex items-center gap-1">
                <Shield size={12} /> Secure bidding with bid history logs
              </p>
              <p className="flex items-center gap-1">
                <TrendingUp size={12} /> {bidsPlaced} bids placed
              </p>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-slate-950 mb-4 dark:text-slate-50">Related Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((a) => (
              <AuctionCard key={a.id} auction={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}