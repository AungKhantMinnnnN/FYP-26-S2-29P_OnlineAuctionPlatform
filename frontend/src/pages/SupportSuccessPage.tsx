import { CheckCircle2, Clock3, Home, Search, RotateCcw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export default function SupportSuccessPage() {
  const { state } = useLocation()

  const ticketId = state?.id || 'Pending'
  const category = state?.category || 'Support Case'
  const subject = state?.subject || 'Submitted Request'
  const status = state?.status || 'open'

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center rounded-[2rem] bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={48} className="text-green-600" />
          </div>
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Support Case Submitted!
          </h1>
          <p className="mt-3 leading-7 text-slate-500">
            Thank you for contacting AuctionHub.
            <br />
            Your support request has been successfully submitted.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <span className="text-slate-500">Ticket ID</span>
            <span className="font-bold text-accent-700">{ticketId}</span>
          </div>

          <div className="mt-4 flex items-center justify-between border-b border-slate-200 pb-4">
            <span className="text-slate-500">Category</span>
            <span className="font-semibold">{category}</span>
          </div>

          <div className="mt-4 flex items-center justify-between border-b border-slate-200 pb-4">
            <span className="text-slate-500">Subject</span>
            <span className="font-semibold">{subject}</span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-500">
              <Clock3 size={16} />
              Status
            </span>
            <span className="font-semibold capitalize text-green-600">
              {status}
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 rounded-2xl bg-accent-600 px-5 py-3 font-semibold text-white transition hover:bg-accent-700"
          >
            <Home size={18} />
            Dashboard
          </Link>

          <Link
            to="/browse"
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Search size={18} />
            Browse
          </Link>

          <Link
            to="/support"
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <RotateCcw size={18} />
            Submit Again
          </Link>
        </div>
      </div>
    </div>
  )
}