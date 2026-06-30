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
  Wrench,
} from 'lucide-react'

type TabType = 'support' | 'story'

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<TabType>('support')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (activeTab === 'support') {
      navigate('/support/success')
    } else {
      navigate('/testimonial/success')
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
                  <p className="text-sm text-slate-500">
                    Choose a topic below
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {helpCards.map(({ title, text, icon: Icon }) => (
                  <div
                    key={title}
                    className="group rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-accent-200 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-accent-700 ring-1 ring-slate-100 group-hover:bg-accent-50">
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
                <span className="inline-flex items-center justify-center gap-2">
                  <LifeBuoy size={16} />
                  Submit Support Case
                </span>
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
                <span className="inline-flex items-center justify-center gap-2">
                  <MessageSquareHeart size={16} />
                  Share Your Story
                </span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'support' ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Issue Type
                    </label>
                    <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15">
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
                      type="text"
                      required
                      placeholder="Briefly describe your issue"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Description
                    </label>
                    <textarea
                      required
                      rows={6}
                      placeholder="Tell us more about the problem you are facing..."
                      className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Testimonial Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Example: Great auction experience"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Your Story
                    </label>
                    <textarea
                      required
                      rows={7}
                      placeholder="Share your experience using AuctionHub..."
                      className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                    />
                  </div>
                </>
              )}

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 text-accent-600" size={18} />
                  <p className="text-sm leading-6 text-slate-500">
                    Your submission will be reviewed by our team. Please make
                    sure the information provided is accurate before submitting.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-600 px-5 py-3.5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-accent-700"
              >
                <Send size={17} />
                {activeTab === 'support'
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