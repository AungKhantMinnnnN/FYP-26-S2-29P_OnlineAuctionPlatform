import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, Image, Heart, User, TrendingUp, Shield, Wallet } from 'lucide-react'
import CountdownBadge from '../components/CountdownBadge'
import StatusBadge from '../components/StatusBadge'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import AuctionCard from '../components/AuctionCard'
import { bids, listings, user_interactions, wallet_transactions } from '../data/mockData'
import { useAuth } from '../context/AuthContext'

export default function AuctionDetailPage() {
  const { id } = useParams()
  const auction = listings.find(a => a.id === Number(id)) || listings[0]
  const { user, adjustBalance } = useAuth()
  const [currentBid, setCurrentBid] = useState(auction.current_price)
  const [bidsPlaced, setBidsPlaced] = useState(auction.bids)
  const [bidHistory, setBidHistory] = useState(auction.bidHistory)
  const [localBids, setLocalBids] = useState([])
  const [, setLocalTransactions] = useState(wallet_transactions)
  const [, setLocalInteractions] = useState(user_interactions)
  const [bidMessage, setBidMessage] = useState('')
  const [bidError, setBidError] = useState('')
  const [watched, setWatched] = useState(false)
  const related = listings.filter(a => a.id !== auction.id && a.category_id === auction.category_id).slice(0, 3)
  const nextBid = useMemo(() => Number((currentBid + auction.min_increment).toFixed(2)), [auction.min_increment, currentBid])
  const balance = user?.balance ?? 0
  const hasEnded = auction.end_time && new Date(auction.end_time).getTime() <= Date.now()
  const bidDisabled = !user || user.role === 'admin' || ['suspended', 'deleted'].includes(user.status) || auction.status !== 'active' || hasEnded || balance < nextBid
  const disabledReason = !user ? 'Please log in before placing a bid.' : user.role === 'admin' ? 'Admins cannot place bids.' : ['suspended', 'deleted'].includes(user.status) ? 'Your account cannot place bids.' : auction.status !== 'active' || hasEnded ? 'This auction is no longer active.' : balance < nextBid ? 'Insufficient Balance. Please top up your wallet first.' : ''

  const handleBid = () => {
    setBidMessage('')
    setBidError('')
    if (bidDisabled) return setBidError(disabledReason)

    const bid = { id: `local-${Date.now()}`, listing_id: auction.id, bidder_id: user.id, amount: nextBid, status: 'accepted', placed_at: 'just now' }
    setLocalBids((items) => [bid, ...items])
    setLocalTransactions((items) => [{ id: `local-hold-${Date.now()}`, user_id: user.id, type: 'bid_hold', amount: -nextBid, reference: `Wallet hold for listing #${auction.id}`, status: 'completed', created_at: 'just now' }, ...items])
    setLocalInteractions((items) => [{ id: `local-bid-${Date.now()}`, user_id: user.id, listing_id: auction.id, action: 'bid', occurred_at: 'just now' }, ...items])
    setCurrentBid(nextBid)
    setBidsPlaced((count) => count + 1)
    setBidHistory((history) => [{ bidder: user.username || user.email, amount: nextBid, time: 'just now' }, ...history])
    adjustBalance(-nextBid)
    setBidMessage(`Bid placed successfully. $${nextBid.toFixed(2)} has been held from your Balance.`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 dark:text-slate-400">
        <Link to="/" className="hover:text-slate-700 dark:hover:text-slate-200">Home</Link>
        <ChevronRight size={14} />
        <Link to="/browse" className="hover:text-slate-700 dark:hover:text-slate-200">Browse</Link>
        <ChevronRight size={14} />
        <Link to="/browse" className="hover:text-slate-700 dark:hover:text-slate-200">Browse</Link>
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
              {[1,2,3].map(i => (
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
                    <div className="w-8 h-8 rounded-full bg-accent-50 flex items-center justify-center text-accent-700 text-xs font-bold dark:bg-accent-950/40 dark:text-accent-300">{b.bidder[0].toUpperCase()}</div>
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
              <p className="text-sm text-slate-500 mb-1 dark:text-slate-400">Minimum Increment</p>
              <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">${auction.min_increment.toFixed(2)}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-1 dark:text-slate-400">Next Bid</p>
              <p className="text-2xl font-bold text-accent-700 dark:text-accent-300">${nextBid.toFixed(2)}</p>
            </div>
            <div className="mb-4 rounded-2xl bg-accent-50 p-3 text-sm text-accent-800 ring-1 ring-accent-100 dark:bg-accent-950/30 dark:text-accent-200 dark:ring-accent-900/50">
              <p className="flex items-center justify-between font-semibold"><span className="inline-flex items-center gap-2"><Wallet size={15} /> Your Balance</span><span>${balance.toFixed(2)}</span></p>
            </div>
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-1 dark:text-slate-400">Time remaining</p>
              <CountdownBadge endTime={auction.end_time} className="text-sm px-3 py-1.5" />
            </div>

            <div className="space-y-3">
              {bidError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">{bidError}</p>}
              {bidMessage && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{bidMessage}</p>}
              <PrimaryButton fullWidth disabled={bidDisabled} onClick={handleBid}>Place Bid ${nextBid.toFixed(2)}</PrimaryButton>
              {disabledReason && <p className="text-xs text-slate-500 dark:text-slate-400">{disabledReason}</p>}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <SecondaryButton fullWidth onClick={() => setWatched(!watched)}>
                <Heart size={16} className={`mr-1 ${watched ? 'fill-red-500 text-red-500' : ''}`} /> {watched ? 'Added to Watchlist' : 'Watchlist'}
              </SecondaryButton>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1 dark:border-slate-800 dark:text-slate-400">
              <p className="flex items-center gap-1"><Shield size={12} /> Secure bidding with bid history logs</p>
              <p className="flex items-center gap-1"><TrendingUp size={12} /> {bidsPlaced} bids placed</p>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-slate-950 mb-4 dark:text-slate-50">Related Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map(a => <AuctionCard key={a.id} auction={a} />)}
          </div>
        </div>
      )}
    </div>
  )
}