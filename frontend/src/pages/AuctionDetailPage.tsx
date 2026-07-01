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
import { getMyWatchlist, addToWatchlist, removeFromWatchlist } from '../api/watchlistApi'

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
  const [watchLoading, setWatchLoading] = useState(false)
  const [watchError, setWatchError] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
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
          apiClient.get(`/auctions/get_auction/${id}`),
          apiClient.get(`/auctions/get_auction_bids/${id}/bids`)
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

    const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/v1.0.0/bids/ws'
    const wsUrl = `${wsBaseUrl.replace(/\/$/, '')}/${id}?token=${token}`
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

  // Reflect whether this listing is already on the user's watchlist.
  useEffect(() => {
    if (!user || !id) return
    let active = true
    getMyWatchlist()
      .then((data) => {
        if (active) setWatched(data.listing_ids.includes(id))
      })
      .catch(() => {
        // Non-fatal — leave the button in its default (unwatched) state.
      })
    return () => { active = false }
  }, [user, id])

  const handleToggleWatch = async () => {
    setWatchError('')
    if (!user) {
      setWatchError('Please log in to use your watchlist.')
      return
    }
    if (!id || watchLoading) return
    setWatchLoading(true)
    try {
      if (watched) {
        await removeFromWatchlist(id)
        setWatched(false)
      } else {
        await addToWatchlist(id)
        setWatched(true)
      }
    } catch {
      setWatchError('Could not update your watchlist. Please try again.')
    } finally {
      setWatchLoading(false)
    }
  }

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
    if (amount <= 0) {
      setBidError('Bid amount must be greater than zero.')
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
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-slate-700">Home</Link>
        <ChevronRight size={14} />
        <Link to="/browse" className="hover:text-slate-700">Browse</Link>
        <ChevronRight size={14} />
        <Link to={`/browse?cat=${auction.category}`} className="hover:text-slate-700">{auction.category}</Link>
        <ChevronRight size={14} />
        <span className="text-slate-950 truncate max-w-xs">{auction.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-accent-50 flex items-center justify-center mb-3 overflow-hidden">
              {auction.images && auction.images.length > 0 ? (
                <img 
                  src={selectedImage || auction.images[0].image_url} 
                  alt={auction.title} 
                  className="w-full h-full object-cover transition-opacity duration-300" 
                />
              ) : (
                <Image size={48} className="text-slate-300" />
              )}
            </div>
            {auction.images && auction.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {auction.images.map((img: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => setSelectedImage(img.image_url)}
                    className={`w-20 h-20 shrink-0 rounded-xl flex items-center justify-center overflow-hidden border-2 transition-all ${
                      (selectedImage === img.image_url) || (!selectedImage && i === 0)
                        ? 'border-accent-500 ring-2 ring-accent-500/20' 
                        : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={img.image_url} alt={`${auction.title} detail`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={auction.status} />
              <span className="text-xs text-slate-500">{auction.condition}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 mb-3">{auction.title}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
              <User size={16} />
              <span className="font-medium">{auction.seller.name}</span>
              <span className="text-slate-400">•</span>
              <span>{auction.seller.rating} ★</span>
            </div>
            <p className="text-slate-700 text-sm leading-relaxed">{auction.description}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-950 mb-3">Bid History</h3>
            <div className="divide-y divide-slate-100">
              {bidHistory.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-50 flex items-center justify-center text-accent-700 text-xs font-bold">
                      {b.bidder[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">{b.bidder}</p>
                      <p className="text-xs text-slate-500">{b.time}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-slate-950">${b.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sticky top-24">
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-1">
                {auction.bidding_type === 'low_start' && bidsPlaced === 0 ? 'Starting price' : 'Current highest bid'}
              </p>
              <p className="text-3xl font-bold text-slate-950">${currentBid.toFixed(2)}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-1">
                {auction.bidding_type === 'public' ? 'Minimum required bid' : 'Minimum next bid'}
              </p>
              <p className="text-lg font-semibold text-slate-950">
                ${minimumBid.toFixed(2)}
                {auction.bidding_type === 'public' && <span className="text-sm text-slate-500 font-normal ml-2">(Any higher amount)</span>}
              </p>
            </div>
            {user && (
              <div className="mb-4 rounded-2xl bg-accent-50 p-3 text-sm text-accent-800 ring-1 ring-accent-100">
                <p className="flex items-center justify-between font-semibold">
                  <span className="inline-flex items-center gap-2"><Wallet size={15} /> Your Balance</span>
                  <span>${balance.toFixed(2)}</span>
                </p>
              </div>
            )}
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-1">Time remaining</p>
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
              />
              {bidError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{bidError}</p>}
              {bidMessage && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{bidMessage}</p>}
              <PrimaryButton fullWidth type="submit">Place Bid</PrimaryButton>
            </form>

            <div className="flex items-center gap-2 mt-3">
              <SecondaryButton fullWidth onClick={handleToggleWatch} disabled={watchLoading}>
                <Heart size={16} className={`mr-1 ${watched ? 'fill-red-500 text-red-500' : ''}`} /> {watchLoading ? 'Updating...' : watched ? 'Added to Watchlist' : 'Watchlist'}
              </SecondaryButton>
            </div>
            {watchError && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{watchError}</p>}

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
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
          <h2 className="text-lg font-semibold text-slate-950 mb-4">Related Items</h2>
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