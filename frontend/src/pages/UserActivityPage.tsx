import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, DollarSign, Eye, Gavel, Heart, MessageSquareWarning, Package, PlusCircle, Star, ThumbsUp, Trophy, TrendingUp } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import PrimaryButton from '../components/PrimaryButton'
import StatusBadge from '../components/StatusBadge'
import StyledSelect from '../components/StyledSelect'
import { useAuth } from '../context/AuthContext'
import { getMyListings, getSellerStats, type AuctionListing } from '../api/auctionsApi'
import { getMyBids, getMyPurchases, type BidHistoryItem, type PurchaseItem } from '../api/usersApi'
import {
  getFeedbackTypes, checkFeedbackEligibility, submitFeedback, getMySubmittedFeedback,
  type FeedbackType,
} from '../api/feedbackApi'
import { getIssueTypes, createSupportTicket, type IssueType } from '../api/supportApi'

interface SellerStats {
  total_views: number
  total_watchlists: number
  total_sales: number
  total_revenue: number
}

type Tab = 'listings' | 'bids' | 'purchases'

const timeRemaining = (endTime: string) => {
  const ms = new Date(endTime).getTime() - Date.now()
  if (ms <= 0) return 'Ended'
  const totalMins = Math.floor(ms / 60000)
  const d = Math.floor(totalMins / 1440)
  const h = Math.floor((totalMins % 1440) / 60)
  const m = totalMins % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function UserActivityPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('listings')
  const [listings, setListings] = useState<AuctionListing[]>([])
  const [bids, setBids] = useState<BidHistoryItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [stats, setStats] = useState<SellerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Listings the user has already left any feedback for, so a purchase row can show
  // "Feedback submitted" instead of the button without a per-row API call.
  const [feedbackedListingIds, setFeedbackedListingIds] = useState<Set<string>>(new Set())
  const [feedbackTypes, setFeedbackTypes] = useState<FeedbackType[]>([])
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([])

  // Leave-feedback modal
  const [feedbackPurchase, setFeedbackPurchase] = useState<PurchaseItem | null>(null)
  const [fbEligibleTypeIds, setFbEligibleTypeIds] = useState<string[]>([])
  const [fbSubmittedTypeIds, setFbSubmittedTypeIds] = useState<string[]>([])
  const [fbSellerId, setFbSellerId] = useState('')
  const [fbTypeId, setFbTypeId] = useState('')
  const [fbRating, setFbRating] = useState(5)
  const [fbComment, setFbComment] = useState('')
  const [fbLoadingEligibility, setFbLoadingEligibility] = useState(false)
  const [fbSubmitting, setFbSubmitting] = useState(false)
  const [fbError, setFbError] = useState('')

  // Report-an-issue modal
  const [issuePurchase, setIssuePurchase] = useState<PurchaseItem | null>(null)
  const [issueTypeId, setIssueTypeId] = useState('')
  const [issueSubject, setIssueSubject] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [issueSubmitting, setIssueSubmitting] = useState(false)
  const [issueSubmitted, setIssueSubmitted] = useState(false)
  const [issueError, setIssueError] = useState('')

  useEffect(() => {
    if (!user) return
    const fetchAll = async () => {
      setIsLoading(true)
      try {
        const [listingsData, bidsData, purchasesData, statsData, myFeedback, allIssueTypes, allFeedbackTypes] = await Promise.all([
          getMyListings({ size: 100 }),
          getMyBids({ size: 100 }),
          getMyPurchases({ size: 100 }),
          getSellerStats(),
          getMySubmittedFeedback(),
          getIssueTypes(),
          getFeedbackTypes(),
        ])
        setListings(listingsData.items)
        setBids(bidsData.items)
        setPurchases(purchasesData.items)
        setStats(statsData)
        setFeedbackedListingIds(new Set(myFeedback.map(f => f.listing_id)))
        setIssueTypes(allIssueTypes)
        setFeedbackTypes(allFeedbackTypes)
        setLoadError(false)
      } catch (err) {
        console.error('Failed to load activity', err)
        setLoadError(true)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [user])

  const openFeedbackModal = async (purchase: PurchaseItem) => {
    setFeedbackPurchase(purchase)
    setFbError('')
    setFbComment('')
    setFbRating(5)
    setFbLoadingEligibility(true)
    try {
      const r = await checkFeedbackEligibility(purchase.listing_id)
      setFbEligibleTypeIds(r.eligible_type_ids)
      setFbSubmittedTypeIds(r.already_submitted_type_ids)
      setFbSellerId(r.seller_id || '')
      const firstEligible = r.eligible_type_ids.find(id => !r.already_submitted_type_ids.includes(id))
      setFbTypeId(firstEligible ?? '')
    } catch {
      setFbError("Couldn't check your eligibility for this purchase. Please try again.")
    } finally {
      setFbLoadingEligibility(false)
    }
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackPurchase || !fbTypeId || !fbSellerId) return
    setFbError('')
    setFbSubmitting(true)
    try {
      await submitFeedback({
        listing_id: feedbackPurchase.listing_id,
        reviewee_id: fbSellerId,
        feedback_type_id: fbTypeId,
        rating: fbRating,
        comment: fbComment || undefined,
      })
      setFeedbackedListingIds(prev => new Set(prev).add(feedbackPurchase.listing_id))
      setFeedbackPurchase(null)
    } catch (err: any) {
      setFbError(err?.response?.data?.detail || 'Unable to submit feedback. Please try again.')
    } finally {
      setFbSubmitting(false)
    }
  }

  const openIssueModal = (purchase: PurchaseItem) => {
    setIssuePurchase(purchase)
    setIssueError('')
    setIssueSubmitted(false)
    setIssueSubject('')
    setIssueDescription('')
    setIssueTypeId(issueTypes[0]?.id ?? '')
  }

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issuePurchase || !issueTypeId) return
    setIssueError('')
    setIssueSubmitting(true)
    try {
      const selectedType = issueTypes.find(t => t.id === issueTypeId)
      await createSupportTicket({
        listing_id: issuePurchase.listing_id,
        issue_type_id: issueTypeId,
        subject: issueSubject,
        category: selectedType?.name || 'Other',
        description: issueDescription,
      })
      setIssueSubmitted(true)
    } catch {
      setIssueError('Unable to submit your report. Please try again.')
    } finally {
      setIssueSubmitting(false)
    }
  }

  const activeListings = listings.filter(l => l.status.toLowerCase() === 'active')
  const wonBids = bids.filter(b => b.result === 'won')
  const currentBids = bids.filter(b => b.listing_status === 'active')

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'listings', label: 'My Listings', count: listings.length },
    { id: 'bids', label: 'My Bids', count: bids.length },
    { id: 'purchases', label: 'My Purchases', count: purchases.length },
  ]

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Couldn't load your activity. What's shown below may be incomplete — please refresh.
        </div>
      )}
      {/* Header banner */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
              Activity Hub
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Your Auction Activity</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Track your listings, monitor your bids, and review your purchases all in one place.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-950">Overview</p>
              <PrimaryButton to="/create-listing">
                <PlusCircle size={15} className="mr-1.5" /> Create Listing
              </PrimaryButton>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Listings', value: listings.length },
                { label: 'Active Bids', value: currentBids.length },
                { label: 'Total Bids', value: bids.length },
                { label: 'Wins', value: purchases.length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
                  <p className="text-2xl font-bold text-slate-950">{isLoading ? '—' : value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <DashboardStatCard title="Active Listings" value={isLoading ? '—' : activeListings.length} icon={Package} trend="Currently live" />
        <DashboardStatCard title="Active Bids" value={isLoading ? '—' : currentBids.length} icon={TrendingUp} trend="Auctions you're in" />
        <DashboardStatCard title="Total Wins" value={isLoading ? '—' : wonBids.length} icon={Trophy} trend="Auctions won" />
        <DashboardStatCard title="Sales Revenue" value={isLoading ? '—' : `$${(stats?.total_revenue ?? 0).toFixed(2)}`} icon={DollarSign} trend="From completed sales" />
        <DashboardStatCard title="Total Bids" value={isLoading ? '—' : bids.length} icon={Gavel} trend="Bids placed" />
        <DashboardStatCard title="Item Views" value={isLoading ? '—' : (stats?.total_views ?? 0)} icon={Eye} trend="Across all listings" />
        <DashboardStatCard title="Watchlisted" value={isLoading ? '—' : (stats?.total_watchlists ?? 0)} icon={Heart} trend="By other users" />
      </div>

      {/* Current Bids section */}
      {!isLoading && currentBids.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                <TrendingUp size={18} />
              </span>
              <div>
                <h2 className="font-semibold text-slate-950">Current Bids</h2>
                <p className="text-xs text-slate-500">Auctions you're actively participating in</p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-700">
              {currentBids.length} live
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentBids.map(b => {
              const isLeading = b.result === 'leading'
              const remaining = timeRemaining(b.listing_end_time)
              const isEndingSoon = new Date(b.listing_end_time).getTime() - Date.now() < 3600000
              return (
                <div
                  key={b.listing_id}
                  className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                    isLeading
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                      isLeading
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isLeading ? '● Leading' : '● Outbid'}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      isEndingSoon ? 'text-red-600' : 'text-slate-500'
                    }`}>
                      <Clock size={11} />
                      {remaining}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/auction/${b.listing_id}`)}
                    className="mb-3 line-clamp-2 text-left text-sm font-semibold text-slate-900 hover:text-accent-600"
                  >
                    {b.listing_title}
                  </button>

                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500">My bid</p>
                      <p className="text-base font-bold text-slate-950">${b.my_highest_bid.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Current price</p>
                      <p className={`text-base font-bold ${isLeading ? 'text-emerald-700' : 'text-amber-600'}`}>
                        ${b.current_price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/auction/${b.listing_id}`)}
                    className={`w-full rounded-xl py-2 text-xs font-bold transition ${
                      isLeading
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-accent-600 text-white hover:bg-accent-700'
                    }`}
                  >
                    {isLeading ? 'View Auction' : 'Bid Again'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs + content */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-6 grid grid-cols-3 rounded-2xl bg-slate-100 p-1.5">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === id
                  ? 'bg-white text-accent-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
              <span
                className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === id ? 'bg-accent-100 text-accent-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isLoading ? '…' : count}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
            Loading your activity...
          </div>
        ) : activeTab === 'listings' ? (
          <DataTable
            headers={['Title', 'Status', 'Current Price', 'End Date', 'Actions']}
            rows={listings.map(l => {
              const isDraft = l.status.toLowerCase() === 'draft'
              return [
                <span key={`t-${l.id}`} className="font-medium text-slate-900">
                  {l.title}
                </span>,
                <StatusBadge key={`s-${l.id}`} status={l.status} />,
                `$${(l.current_price ?? l.starting_price ?? 0).toFixed(2)}`,
                l.end_time ? new Date(l.end_time).toLocaleDateString() : '—',
                <button
                  key={`v-${l.id}`}
                  onClick={() => navigate(isDraft ? `/edit-listing/${l.id}` : `/auction/${l.id}`)}
                  className="text-xs font-semibold text-accent-600 hover:underline"
                >
                  {isDraft ? 'Edit' : 'View'}
                </button>,
              ]
            })}
            emptyMessage="You haven't created any listings yet."
          />
        ) : activeTab === 'bids' ? (
          <DataTable
            headers={['Item', 'My Bid', 'Current Price', 'Result', 'Placed At']}
            rows={bids.map((b, i) => [
              <button
                key={`t-${i}`}
                onClick={() => navigate(`/auction/${b.listing_id}`)}
                className="text-left font-medium text-slate-900 hover:text-accent-600 hover:underline"
              >
                {b.listing_title}
              </button>,
              `$${b.my_highest_bid.toFixed(2)}`,
              `$${b.current_price.toFixed(2)}`,
              <StatusBadge key={`r-${i}`} status={b.result} />,
              new Date(b.placed_at).toLocaleDateString(),
            ])}
            emptyMessage="You haven't placed any bids yet."
          />
        ) : (
          <DataTable
            headers={['Item', 'Final Price', 'Date Won', 'Actions']}
            rows={purchases.map((p, i) => [
              <button
                key={`t-${i}`}
                onClick={() => navigate(`/auction/${p.listing_id}`)}
                className="text-left font-medium text-slate-900 hover:text-accent-600 hover:underline"
              >
                {p.listing_title}
              </button>,
              `$${p.final_price.toFixed(2)}`,
              new Date(p.ended_at).toLocaleDateString(),
              <div key={`a-${i}`} className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate(`/auction/${p.listing_id}`)}
                  className="text-xs font-semibold text-accent-600 hover:underline"
                >
                  View
                </button>
                {feedbackedListingIds.has(p.listing_id) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <Star size={12} className="fill-emerald-600" /> Feedback submitted
                  </span>
                ) : (
                  <button
                    onClick={() => openFeedbackModal(p)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:underline"
                  >
                    <ThumbsUp size={12} /> Leave Feedback
                  </button>
                )}
                <button
                  onClick={() => openIssueModal(p)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                >
                  <MessageSquareWarning size={12} /> Report an Issue
                </button>
              </div>,
            ])}
            emptyMessage="You haven't won any auctions yet."
          />
        )}
      </div>

      <Modal isOpen={!!feedbackPurchase} onClose={() => setFeedbackPurchase(null)} title="Leave Feedback">
        {feedbackPurchase && (
          <form onSubmit={handleFeedbackSubmit} className="space-y-5">
            <p className="text-sm text-slate-500">For <span className="font-semibold text-slate-800">{feedbackPurchase.listing_title}</span></p>

            {fbLoadingEligibility ? (
              <p className="text-sm text-slate-400">Checking eligibility…</p>
            ) : fbEligibleTypeIds.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                You're not eligible to leave feedback for this purchase.
              </p>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Feedback Type</label>
                  <div className="space-y-2">
                    {feedbackTypes.filter(ft => fbEligibleTypeIds.includes(ft.id)).map(ft => {
                      const alreadyDone = fbSubmittedTypeIds.includes(ft.id)
                      return (
                        <label
                          key={ft.id}
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                            alreadyDone
                              ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                              : fbTypeId === ft.id
                                ? 'cursor-pointer border-accent-500 bg-accent-50'
                                : 'cursor-pointer border-slate-200 hover:border-accent-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="fbType"
                            value={ft.id}
                            checked={fbTypeId === ft.id}
                            disabled={alreadyDone}
                            onChange={() => setFbTypeId(ft.id)}
                            className="accent-accent-600"
                          />
                          <span className="text-sm font-medium text-slate-800">{ft.name}</span>
                          {alreadyDone && <span className="ml-auto text-xs font-semibold text-emerald-600">Submitted</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} type="button" onClick={() => setFbRating(v)} className={`rounded-xl p-1.5 ${v <= fbRating ? 'text-yellow-500' : 'text-slate-300'}`}>
                        <Star size={22} fill="currentColor" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Comment <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={fbComment}
                    onChange={e => setFbComment(e.target.value)}
                    rows={3}
                    placeholder="Share details about your experience…"
                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                  />
                </div>

                {fbError && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{fbError}</div>}

                <button
                  type="submit"
                  disabled={fbSubmitting || !fbTypeId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ThumbsUp size={16} />
                  {fbSubmitting ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </>
            )}
          </form>
        )}
      </Modal>

      <Modal isOpen={!!issuePurchase} onClose={() => setIssuePurchase(null)} title="Report an Issue">
        {issuePurchase && (
          issueSubmitted ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-600">
                Your report has been submitted. Track its status under{' '}
                <button onClick={() => navigate('/support?tab=tickets')} className="font-semibold text-accent-600 hover:underline">
                  Support → My Tickets
                </button>.
              </p>
              <button
                onClick={() => setIssuePurchase(null)}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleIssueSubmit} className="space-y-5">
              <p className="text-sm text-slate-500">About <span className="font-semibold text-slate-800">{issuePurchase.listing_title}</span></p>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Issue Type</label>
                <StyledSelect value={issueTypeId} onChange={e => setIssueTypeId(e.target.value)} required>
                  {issueTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </StyledSelect>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Subject</label>
                <input
                  value={issueSubject}
                  onChange={e => setIssueSubject(e.target.value)}
                  required
                  placeholder="Briefly describe the issue"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Description</label>
                <textarea
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder="What went wrong with this order?"
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                />
              </div>

              {issueError && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{issueError}</div>}

              <button
                type="submit"
                disabled={issueSubmitting || !issueTypeId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MessageSquareWarning size={16} />
                {issueSubmitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </form>
          )
        )}
      </Modal>
    </div>
  )
}
