import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Clock,
  CreditCard,
  HelpCircle,
  LifeBuoy,
  ListChecks,
  MessageSquareHeart,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  ThumbsUp,
} from 'lucide-react'
import {
  createSupportTicket,
  createTestimonial,
  getIssueTypes,
  getMyDisputes,
  getMyTestimonials,
} from '../api/supportApi'
import type { SupportTicketResponse, TestimonialResponse } from '../api/supportApi'
import {
  getFeedbackTypes,
  checkFeedbackEligibility,
  submitFeedback,
} from '../api/feedbackApi'
import type { FeedbackType } from '../api/feedbackApi'
import { useAuth } from '../context/AuthContext'
import { getMyBids } from '../api/usersApi'
import StatusBadge from '../components/StatusBadge'

type TabType = 'support' | 'story' | 'feedback' | 'tickets'

function formatTicketDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const sortIssueTypes = (issueTypes: { id: string; name: string }[]) => {
  return [...issueTypes].sort((a, b) => {
    if (a.name === 'Other') return 1
    if (b.name === 'Other') return -1
    return a.name.localeCompare(b.name)
  })
}

export default function SupportPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'tickets' ? 'tickets' : 'support'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [issueTypes, setIssueTypes] = useState<{ id: string; name: string }[]>([])
  const [selectedIssueTypeId, setSelectedIssueTypeId] = useState('')
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [testimonial, setTestimonial] = useState('')
  const [rating, setRating] = useState(5)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingIssueTypes, setIsLoadingIssueTypes] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Feedback tab state
  const [feedbackTypes, setFeedbackTypes] = useState<FeedbackType[]>([])
  const [biddedListings, setBiddedListings] = useState<{ id: string; title: string; seller_id: string }[]>([])
  const [fbListingId, setFbListingId] = useState('')
  const [fbRevieweeId, setFbRevieweeId] = useState('')
  const [fbTypeId, setFbTypeId] = useState('')
  const [fbRating, setFbRating] = useState(5)
  const [fbComment, setFbComment] = useState('')
  const [eligibleTypeIds, setEligibleTypeIds] = useState<string[]>([])
  const [submittedTypeIds, setSubmittedTypeIds] = useState<string[]>([])
  const [fbLoadingEligibility, setFbLoadingEligibility] = useState(false)
  const [fbSuccess, setFbSuccess] = useState('')

  // My Tickets tab state
  const [tickets, setTickets] = useState<SupportTicketResponse[]>([])
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [ticketsError, setTicketsError] = useState('')

  useEffect(() => {
    if (activeTab !== 'tickets' || !user) return
    setIsLoadingTickets(true)
    setTicketsError('')
    getMyDisputes()
      .then(setTickets)
      .catch(() => setTicketsError('Unable to load your tickets. Please try again.'))
      .finally(() => setIsLoadingTickets(false))
  }, [activeTab, user])

  // My Testimonials (shown under the Share Story tab)
  const [myTestimonials, setMyTestimonials] = useState<TestimonialResponse[]>([])

  useEffect(() => {
    if (activeTab !== 'story' || !user) return
    getMyTestimonials().then(setMyTestimonials).catch(() => {})
  }, [activeTab, user])

  useEffect(() => {
    const loadIssueTypes = async () => {
      try {
        const data = await getIssueTypes()
        const sortedIssueTypes = sortIssueTypes(data)
        setIssueTypes(sortedIssueTypes)
        if (sortedIssueTypes.length > 0) {
          setSelectedIssueTypeId(sortedIssueTypes[0].id)
          setCategory(sortedIssueTypes[0].name)
        }
      } catch (err) {
        console.error('Failed to load issue types:', err)
        setError('Unable to load support issue types. Please refresh and try again.')
      } finally {
        setIsLoadingIssueTypes(false)
      }
    }
    loadIssueTypes()
  }, [])

  useEffect(() => {
    if (!user) return
    const loadFeedbackData = async () => {
      try {
        const [types, bids] = await Promise.all([
          getFeedbackTypes(),
          getMyBids({ size: 100 }),
        ])
        setFeedbackTypes(types)
        const seen = new Set<string>()
        const listings: { id: string; title: string; seller_id: string }[] = []
        for (const b of bids.items) {
          if (!seen.has(b.listing_id)) {
            seen.add(b.listing_id)
            listings.push({ id: b.listing_id, title: b.listing_title, seller_id: '' })
          }
        }
        setBiddedListings(listings)
      } catch (err) {
        console.error('Failed to load feedback data:', err)
      }
    }
    loadFeedbackData()
  }, [user])

  useEffect(() => {
    if (!fbListingId || !user) return
    setFbLoadingEligibility(true)
    setEligibleTypeIds([])
    setSubmittedTypeIds([])
    setFbTypeId('')
    checkFeedbackEligibility(fbListingId)
      .then(r => {
        setEligibleTypeIds(r.eligible_type_ids)
        setSubmittedTypeIds(r.already_submitted_type_ids)
        const firstEligible = r.eligible_type_ids.find(id => !r.already_submitted_type_ids.includes(id))
        setFbTypeId(firstEligible ?? '')
        if (r.seller_id) setFbRevieweeId(r.seller_id)
      })
      .catch(console.error)
      .finally(() => setFbLoadingEligibility(false))
  }, [fbListingId, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (activeTab === 'support' && !selectedIssueTypeId) {
      setError('Please select an issue type before submitting.')
      return
    }

    setIsSubmitting(true)
    try {
      if (activeTab === 'support') {
        const selectedIssueType = issueTypes.find(t => t.id === selectedIssueTypeId)
        const result = await createSupportTicket({
          listing_id: null,
          issue_type_id: selectedIssueTypeId,
          subject,
          category: selectedIssueType?.name || category,
          description,
        })
        navigate('/support/success', { state: result })
      } else if (activeTab === 'story') {
        const result = await createTestimonial({ content: testimonial, rating })
        navigate('/testimonial/success', { state: result })
      }
    } catch (err) {
      console.error(err)
      setError('Unable to submit your request. Please check your connection or try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFbSuccess('')
    if (!fbListingId || !fbTypeId || !fbRevieweeId) {
      setError('Please select a listing and feedback type.')
      return
    }
    setIsSubmitting(true)
    try {
      await submitFeedback({
        listing_id: fbListingId,
        reviewee_id: fbRevieweeId,
        feedback_type_id: fbTypeId,
        rating: fbRating,
        comment: fbComment || undefined,
      })
      setFbSuccess('Your feedback has been submitted successfully!')
      setFbComment('')
      setFbRating(5)
      // Refresh eligibility to show this type as already submitted
      const r = await checkFeedbackEligibility(fbListingId)
      setEligibleTypeIds(r.eligible_type_ids)
      setSubmittedTypeIds(r.already_submitted_type_ids)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const helpCards = [
    {
      title: 'General Questions',
      text: 'Find help for account, auction, and browsing questions.',
      icon: HelpCircle,
    },
    {
      title: 'Payment Issues',
      text: 'Get support for wallet top-ups, refunds, or failed payments.',
      icon: CreditCard,
    },
    {
      title: 'Technical Support',
      text: 'Report bugs, website errors, or bidding problems.',
      icon: Wrench,
    },
  ]

  return (
    <div className="min-h-[calc(100vh-7rem)] rounded-[2rem] bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-accent-600 text-white shadow-soft">
            <LifeBuoy size={26} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent-600">
            Support Center
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Need Assistance?
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Our support team is ready to help. Submit a support request or share
            your experience with AuctionHub.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
                  <Sparkles size={21} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-950">How can we help?</h2>
                  <p className="text-sm text-slate-500">Choose a topic below</p>
                </div>
              </div>

              <div className="space-y-3">
                {helpCards.map(({ title, text, icon: Icon }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-accent-700 ring-1 ring-slate-100">
                        <Icon size={19} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Clock size={21} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950">Response Time</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Our support team usually responds within 24 hours depending
                    on the issue type.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
            <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5 sm:grid-cols-4 sm:gap-0">
              <button
                type="button"
                onClick={() => { setActiveTab('support'); setError('') }}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                  activeTab === 'support' ? 'bg-white text-accent-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <LifeBuoy size={16} />
                  Support Case
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('tickets'); setError('') }}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                  activeTab === 'tickets' ? 'bg-white text-accent-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <ListChecks size={16} />
                  My Tickets
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('story'); setError('') }}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                  activeTab === 'story' ? 'bg-white text-accent-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <MessageSquareHeart size={16} />
                  Share Story
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('feedback'); setError(''); setFbSuccess('') }}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                  activeTab === 'feedback' ? 'bg-white text-accent-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <ThumbsUp size={16} />
                  Leave Feedback
                </span>
              </button>
            </div>

            {activeTab === 'tickets' ? (
              /* ── My Tickets tab ──────────────────────────────────────────── */
              !user ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <ListChecks size={40} className="text-slate-300" />
                  <p className="text-sm text-slate-500">Sign in to view your support tickets.</p>
                </div>
              ) : isLoadingTickets ? (
                <p className="py-12 text-center text-sm text-slate-400">Loading your tickets…</p>
              ) : ticketsError ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {ticketsError}
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <ListChecks size={40} className="text-slate-300" />
                  <p className="text-sm text-slate-500">You haven't submitted any support tickets yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">{ticket.subject || ticket.category}</p>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{ticket.category}</p>
                        </div>
                        <StatusBadge status={ticket.status} />
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-600">{ticket.description}</p>

                      <p className="mt-3 text-xs text-slate-400">Submitted {formatTicketDate(ticket.created_at)}</p>

                      {ticket.resolution_note && (
                        <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                          <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Response from support</p>
                          <p className="mt-1 leading-6">{ticket.resolution_note}</p>
                          {ticket.resolved_at && (
                            <p className="mt-1 text-xs text-emerald-600">{formatTicketDate(ticket.resolved_at)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === 'feedback' ? (
              /* ── Feedback tab ────────────────────────────────────────────── */
              !user ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <ThumbsUp size={40} className="text-slate-300" />
                  <p className="text-sm text-slate-500">Sign in to leave feedback for buyers or sellers.</p>
                </div>
              ) : biddedListings.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <ThumbsUp size={40} className="text-slate-300" />
                  <p className="text-sm text-slate-500">You haven't participated in any auctions yet.</p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                  {/* Listing selector */}
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Select Auction</label>
                    <select
                      value={fbListingId}
                      onChange={e => { setFbListingId(e.target.value); setFbSuccess('') }}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value="">-- Choose an auction --</option>
                      {biddedListings.map(l => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                    </select>
                  </div>

                  {fbListingId && (
                    fbLoadingEligibility ? (
                      <p className="text-sm text-slate-400">Checking eligibility…</p>
                    ) : eligibleTypeIds.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        You are not eligible to leave feedback for this auction.
                      </div>
                    ) : (
                      <>
                        {/* Feedback type selector */}
                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-700">Feedback Type</label>
                          <div className="space-y-2">
                            {feedbackTypes
                              .filter(ft => eligibleTypeIds.includes(ft.id))
                              .map(ft => {
                                const alreadyDone = submittedTypeIds.includes(ft.id)
                                return (
                                  <label
                                    key={ft.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                                      alreadyDone
                                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                                        : fbTypeId === ft.id
                                          ? 'border-accent-500 bg-accent-50'
                                          : 'border-slate-200 hover:border-accent-300'
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
                                    {alreadyDone && (
                                      <span className="ml-auto text-xs font-semibold text-emerald-600">Submitted</span>
                                    )}
                                  </label>
                                )
                              })}
                          </div>
                        </div>

                        {/* Star rating */}
                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-700">Rating</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setFbRating(v)}
                                className={`rounded-xl p-1.5 ${v <= fbRating ? 'text-yellow-500' : 'text-slate-300'}`}
                              >
                                <Star size={24} fill="currentColor" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Comment */}
                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-700">
                            Comment <span className="font-normal text-slate-400">(optional)</span>
                          </label>
                          <textarea
                            value={fbComment}
                            onChange={e => setFbComment(e.target.value)}
                            rows={4}
                            placeholder="Share details about your experience…"
                            className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                          />
                        </div>

                        {fbSuccess && (
                          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                            {fbSuccess}
                          </div>
                        )}
                        {error && (
                          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                            {error}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmitting || !fbTypeId}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-600 px-5 py-3.5 text-sm font-bold text-white shadow-soft transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ThumbsUp size={17} />
                          {isSubmitting ? 'Submitting…' : 'Submit Feedback'}
                        </button>
                      </>
                    )
                  )}
                </form>
              )
            ) : (
              /* ── Support / Story tabs ────────────────────────────────────── */
              <>
              <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'support' ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Issue Type
                      </label>
                      <select
                        value={selectedIssueTypeId}
                        onChange={(e) => {
                          const selectedId = e.target.value
                          const selectedType = issueTypes.find(
                            (type) => type.id === selectedId
                          )
                          setSelectedIssueTypeId(selectedId)
                          setCategory(selectedType?.name || '')
                        }}
                        required
                        disabled={isLoadingIssueTypes}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {isLoadingIssueTypes ? (
                          <option value="">Loading issue types...</option>
                        ) : issueTypes.length === 0 ? (
                          <option value="">No issue types available</option>
                        ) : (
                          issueTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Subject
                      </label>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        placeholder="Briefly describe your issue"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows={6}
                        placeholder="Tell us more about the problem..."
                        className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Rating
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            className={`rounded-xl p-2 ${
                              value <= rating ? 'text-yellow-500' : 'text-slate-300'
                            }`}
                          >
                            <Star size={24} fill="currentColor" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Your Story
                      </label>
                      <textarea
                        value={testimonial}
                        onChange={(e) => setTestimonial(e.target.value)}
                        required
                        rows={7}
                        placeholder="Share your experience using AuctionHub..."
                        className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                      />
                    </div>
                  </>
                )}

                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {error}
                  </div>
                )}

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 text-accent-600" size={18} />
                    <p className="text-sm leading-6 text-slate-500">
                      Your submission will be reviewed by our team.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (activeTab === 'support' &&
                      (isLoadingIssueTypes || !selectedIssueTypeId))
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-600 px-5 py-3.5 text-sm font-bold text-white shadow-soft transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={17} />
                  {isSubmitting
                    ? 'Submitting...'
                    : activeTab === 'support'
                      ? 'Submit Support Case'
                      : 'Submit Testimonial'}
                </button>
              </form>

              {activeTab === 'story' && user && myTestimonials.length > 0 && (
                <div className="mt-8 space-y-3 border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-700">Your Submitted Stories</h3>
                  {myTestimonials.map(t => (
                    <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className={i < t.rating ? 'fill-accent-600 text-accent-600' : 'text-slate-200 fill-slate-200'} />
                          ))}
                        </div>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.is_featured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {t.is_featured ? 'Approved' : 'Pending Review'}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{t.content}</p>
                      <p className="mt-2 text-xs text-slate-400">Submitted {formatTicketDate(t.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}