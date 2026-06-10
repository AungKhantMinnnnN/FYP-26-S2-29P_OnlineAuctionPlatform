import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, Image, Heart, User, TrendingUp, Shield, Wallet } from 'lucide-react'
import CountdownBadge from '../components/CountdownBadge'
import StatusBadge from '../components/StatusBadge'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import AuctionCard from '../components/AuctionCard'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/apiClient'

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const ws = useRef<WebSocket | null>(null)

  const { user, refreshUser } = useAuth()
  const [currentBid, setCurrentBid] = useState(0)
  const [bidsPlaced, setBidsPlaced] = useState(0)
  const [bidHistory, setBidHistory] = useState([])
  const [bidAmount, setBidAmount] = useState('')
  const [bidMessage, setBidMessage] = useState('')
  const [bidError, setBidError] = useState('')
  const [watched, setWatched] = useState(false)
  
  const related = []
  const minimumBid = useMemo(() => {
    if (!auction) return 0;
    if (auction.bidding_type === 'public') {
      return Number((currentBid + 1.0).toFixed(2));
    }
    if (auction.bidding_type === 'low_start' && bidsPlaced === 0) {
      return Number(auction.starting_price.toFixed(2));
    }
    return bidsPlaced === 0 ? Number(auction.starting_price.toFixed(2)) : Number((currentBid + (auction.minIncrement || 1)).toFixed(2));
  }, [auction, currentBid, bidsPlaced])
  const balance = user?.balance ?? 0

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const [listingRes, bidsRes] = await Promise.all([
          apiClient.get(`/auctions/${id}`),
          apiClient.get(`/auctions/${id}/bids`)
        ])
        const data = listingRes.data
        const bidsData = bidsRes.data
        
        setAuction({
          ...data,
          currentBid: data.current_price,
          minIncrement: data.min_increment,
          endTime: data.end_time,
          seller: { name: data.seller?.username || 'Unknown', rating: '5.0' }
        })
        setCurrentBid(data.current_price || data.starting_price)
        setBidsPlaced(bidsData.length)
        setBidHistory(bidsData.map((b) => ({
          bidder: b.bidder?.username || 'Anonymous',
          amount: b.amount,
          time: new Date(b.placed_at).toLocaleString()
        })))
      } catch (err) {
        setError('Failed to load auction details.' + err)
      } finally {
        setLoading(false)
      }
    }
    fetchAuction()
  }, [id])

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) return

    const wsUrl = `ws://localhost:8001/v1.0.0/bids/ws/${id}?token=${token}`
    ws.current = new WebSocket(wsUrl)

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'new_bid') {
          setCurrentBid(data.current_price)
          setBidsPlaced((count) => count + 1)
          setBidHistory((history) => [
            { bidder: data.bidder_id, amount: data.amount, time: 'just now' },
            ...history
          ])
          setBidError('')
          setBidMessage('A new bid was placed!')
          
          if (user && data.bidder_id === user.id) {
              refreshUser()
          }
        } else if (data.type === 'error') {
          setBidError(data.message)
          setBidMessage('')
        }
      } catch (err) {
        console.error('Failed to parse websocket message', err)
      }
    }

    ws.current.onerror = () => {
      setBidError('Connection error with the bidding server.')
      setBidMessage('')
    }

    ws.current.onclose = (event) => {
      if (!event.wasClean) {
        setBidError('Lost connection to bidding server. Please refresh.')
        setBidMessage('')
      }
    }

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [id, user, refreshUser])

  if (loading) return <div className="text-center py-20 text-slate-500">Loading auction details...</div>
  if (error || !auction) return <div className="text-center py-20 text-red-500">{error || 'Auction not found'}</div>

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

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'place_bid', amount }))
        setBidAmount('')
        setBidMessage('Sending bid...')
    } else {
        setBidError('Real-time connection is unavailable. Please refresh.')
    }
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
              <p className="text-sm text-slate-500 mb-1 dark:text-slate-400">
                {auction.bidding_type === 'low_start' && bidsPlaced === 0 ? 'Starting price' : 'Current highest bid'}
              </p>
              <p className="text-3xl font-bold text-slate-950 dark:text-slate-50">${currentBid.toFixed(2)}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-1 dark:text-slate-400">
                {auction.bidding_type === 'public' ? 'Minimum required bid' : 'Minimum next bid'}
              </p>
              <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                ${minimumBid.toFixed(2)}
                {auction.bidding_type === 'public' && <span className="text-sm text-slate-500 font-normal ml-2">(Any higher amount)</span>}
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
                step={auction.bidding_type === 'public' ? 1.0 : auction.minIncrement}
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