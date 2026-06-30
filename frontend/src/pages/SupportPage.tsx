import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  CreditCard,
  HelpCircle,
  LifeBuoy,
  MessageSquareHeart,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
} from 'lucide-react'
import { createSupportTicket, createTestimonial } from '../api/supportApi'

type TabType = 'support' | 'story'

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<TabType>('support')
  const [category, setCategory] = useState('Technical Issue')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [testimonial, setTestimonial] = useState('')
  const [rating, setRating] = useState(5)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (activeTab === 'support') {
        const result = await createSupportTicket({
          listing_id: null,
          category,
          subject,
          description,
        })

        navigate('/support/success', { state: result })
      } else {
        const result = await createTestimonial({
          content: testimonial,
          rating,
        })

        navigate('/testimonial/success', { state: result })
      }
    } catch (err) {
      console.error(err)
      setError('Submission failed. Please try again.')
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
            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('support')}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  activeTab === 'support'
                    ? 'bg-white text-accent-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Submit Support Case
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('story')}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  activeTab === 'story'
                    ? 'bg-white text-accent-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Share Your Story
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'support' ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Issue Type
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option>Technical Issue</option>
                      <option>Payment Issue</option>
                      <option>Bidding Issue</option>
                      <option>Account Issue</option>
                      <option>Seller / Listing Issue</option>
                      <option>Other</option>
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
                            value <= rating
                              ? 'text-yellow-500'
                              : 'text-slate-300'
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
                disabled={isSubmitting}
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
          </section>
        </div>
      </div>
    </div>
  )
}