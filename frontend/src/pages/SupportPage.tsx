import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Clock, CreditCard, HelpCircle, LifeBuoy, ListChecks, MessageSquareHeart,
  Send, ShieldCheck, Sparkles, Star, Wrench,
} from 'lucide-react'
import {
  createSupportTicket, createTestimonial, getIssueTypes, getMyDisputes, getMyTestimonials,
} from '../api/supportApi'
import type { SupportTicketResponse, TestimonialResponse } from '../api/supportApi'
import { getMyPurchases, type PurchaseItem } from '../api/usersApi'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import StyledSelect from '../components/StyledSelect'

type TopTab = 'new-case' | 'tickets'
type StatusFilter = '' | 'open' | 'in_review' | 'resolved' | 'closed'

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

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export default function SupportPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const initialTab: TopTab = searchParams.get('tab') === 'tickets' ? 'tickets' : 'new-case'
  const [activeTab, setActiveTab] = useState<TopTab>(initialTab)
  const navigate = useNavigate()

  // New Case form state
  const [issueTypes, setIssueTypes] = useState<{ id: string; name: string }[]>([])
  const [selectedIssueTypeId, setSelectedIssueTypeId] = useState('')
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [relatedListingId, setRelatedListingId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingIssueTypes, setIsLoadingIssueTypes] = useState(true)
  const [error, setError] = useState('')

  // My Tickets state
  const [tickets, setTickets] = useState<SupportTicketResponse[]>([])
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [ticketsError, setTicketsError] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')

  // Share Story (secondary section) state
  const [testimonial, setTestimonial] = useState('')
  const [rating, setRating] = useState(5)
  const [storySubmitting, setStorySubmitting] = useState(false)
  const [storyError, setStoryError] = useState('')
  const [myTestimonials, setMyTestimonials] = useState<TestimonialResponse[]>([])
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  const [showStoryForm, setShowStoryForm] = useState(false)

  useEffect(() => {
    if (activeTab !== 'tickets' || !user) return
    setIsLoadingTickets(true)
    setTicketsError('')
    getMyDisputes()
      .then(setTickets)
      .catch(() => setTicketsError('Unable to load your tickets. Please try again.'))
      .finally(() => setIsLoadingTickets(false))
  }, [activeTab, user])

  useEffect(() => {
    if (!user) return
    setIsLoadingStories(true)
    getMyTestimonials().then(setMyTestimonials).catch(() => {}).finally(() => setIsLoadingStories(false))
  }, [user])

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
    getMyPurchases({ size: 100 }).then(r => setPurchases(r.items)).catch(() => {})
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!selectedIssueTypeId) {
      setError('Please select an issue type before submitting.')
      return
    }
    setIsSubmitting(true)
    try {
      const selectedIssueType = issueTypes.find((t) => t.id === selectedIssueTypeId)
      const result = await createSupportTicket({
        listing_id: relatedListingId || null,
        issue_type_id: selectedIssueTypeId,
        subject,
        category: selectedIssueType?.name || category,
        description,
      })
      navigate('/support/success', { state: result })
    } catch (err) {
      console.error(err)
      setError('Unable to submit your request. Please check your connection or try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStoryError('')
    setStorySubmitting(true)
    try {
      const result = await createTestimonial({ content: testimonial, rating })
      navigate('/testimonial/success', { state: result })
    } catch (err) {
      console.error(err)
      setStoryError('Unable to submit your story. Please check your connection or try again.')
    } finally {
      setStorySubmitting(false)
    }
  }

  const filteredTickets = statusFilter ? tickets.filter((t) => t.status === statusFilter) : tickets

  const helpCards = [
    { title: 'General Questions', text: 'Find help for account, auction, and browsing questions.', icon: HelpCircle },
    { title: 'Payment Issues', text: 'Get support for wallet top-ups, refunds, or failed payments.', icon: CreditCard },
    { title: 'Technical Support', text: 'Report bugs, website errors, or bidding problems.', icon: Wrench },
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
            Have an issue with a specific order? Report it right from your{' '}
            <button onClick={() => navigate('/activity')} className="font-semibold text-accent-600 hover:underline">
              Purchase History
            </button>
            . For anything else — account, payments, or general questions — start a case below.
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
            <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('new-case')}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                  activeTab === 'new-case' ? 'bg-white text-accent-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Send size={16} />
                  New Case
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                  activeTab === 'tickets' ? 'bg-white text-accent-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <ListChecks size={16} />
                  My Tickets{tickets.length > 0 && ` (${tickets.length})`}
                </span>
              </button>
            </div>

            {activeTab === 'tickets' ? (
              /* ── My Tickets ──────────────────────────────────────────────── */
              !user ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <ListChecks size={40} className="text-slate-300" />
                  <p className="text-sm text-slate-500">Sign in to view your support tickets.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {STATUS_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setStatusFilter(f.value)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                          statusFilter === f.value
                            ? 'bg-accent-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {isLoadingTickets ? (
                    <p className="py-12 text-center text-sm text-slate-400">Loading your tickets…</p>
                  ) : ticketsError ? (
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                      {ticketsError}
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                      <ListChecks size={40} className="text-slate-300" />
                      <p className="text-sm text-slate-500">
                        {tickets.length === 0 ? "You haven't submitted any support tickets yet." : 'No tickets match this filter.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTickets.map((ticket) => (
                        <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-900">{ticket.subject || ticket.category}</p>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{ticket.category}</p>
                              {ticket.listing && (
                                <p className="mt-1 text-xs font-medium text-accent-700">Re: {ticket.listing.title}</p>
                              )}
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
                  )}
                </div>
              )
            ) : (
              /* ── New Case ────────────────────────────────────────────────── */
              <form onSubmit={handleSubmit} className="space-y-6">
                {purchases.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Related order <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <StyledSelect value={relatedListingId} onChange={(e) => setRelatedListingId(e.target.value)}>
                      <option value="">Not related to a specific order</option>
                      {purchases.map((p) => (
                        <option key={p.listing_id} value={p.listing_id}>{p.listing_title}</option>
                      ))}
                    </StyledSelect>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Issue Type
                  </label>
                  <StyledSelect
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
                  </StyledSelect>
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
                  disabled={isSubmitting || isLoadingIssueTypes || !selectedIssueTypeId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-600 px-5 py-3.5 text-sm font-bold text-white shadow-soft transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={17} />
                  {isSubmitting ? 'Submitting...' : 'Submit Support Case'}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* ── Share Your Story — secondary, not a support ticket ── */}
        <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <MessageSquareHeart size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-950">Share Your Story</h2>
                <p className="text-sm text-slate-500">Tell other users what you love about AuctionHub</p>
              </div>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => setShowStoryForm((s) => !s)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                {showStoryForm ? 'Cancel' : 'Write a story'}
              </button>
            )}
          </div>

          {!user ? (
            <p className="mt-4 text-sm text-slate-500">Sign in to share your story.</p>
          ) : showStoryForm ? (
            <form onSubmit={handleStorySubmit} className="mt-5 space-y-5">
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
                  rows={5}
                  placeholder="Share your experience using AuctionHub..."
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                />
              </div>

              {storyError && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {storyError}
                </div>
              )}

              <button
                type="submit"
                disabled={storySubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                {storySubmitting ? 'Submitting...' : 'Submit Story'}
              </button>
            </form>
          ) : isLoadingStories ? (
            <p className="mt-4 text-sm text-slate-400">Loading your stories…</p>
          ) : myTestimonials.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">You haven't shared a story yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {myTestimonials.map((t) => (
                <div key={t.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={i < t.rating ? 'fill-accent-600 text-accent-600' : 'text-slate-200 fill-slate-200'} />
                      ))}
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.is_featured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {t.is_featured ? 'Featured on landing page' : 'Pending Review'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{t.content}</p>
                  <p className="mt-2 text-xs text-slate-400">Submitted {formatTicketDate(t.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
