import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Gavel } from 'lucide-react'
import SearchBar from './SearchBar'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isPublic = !location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/seller') && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/profile') && !location.pathname.startsWith('/bid-history') && !location.pathname.startsWith('/create-listing')

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <Link to="/" className="group flex items-center gap-2 text-accent-700 dark:text-accent-300">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-soft transition-transform group-hover:-rotate-6 group-hover:scale-105 dark:bg-accent-500">
              <Gavel size={20} />
            </span>
            <span className="font-bold text-lg tracking-tight text-slate-950 dark:text-slate-50">AuctionHub</span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <SearchBar />
          </div>

          <div className="hidden md:flex items-center gap-1">
            <Link to="/browse" className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent-300">Browse</Link>
            <Link to="/seller-dashboard" className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent-300">Sell</Link>
            <Link to="/login" className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent-300">Log In</Link>
            <Link to="/register" className="ml-2 rounded-full bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:bg-accent-500 dark:hover:bg-accent-400 dark:focus:ring-offset-slate-950">Register</Link>
          </div>

          <button className="md:hidden p-2 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-100" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 px-4 py-4 space-y-2 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <SearchBar />
          <Link to="/browse" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>Browse Auctions</Link>
          <Link to="/seller-dashboard" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>Sell an Item</Link>
          <Link to="/login" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>Log In</Link>
          <Link to="/register" className="block rounded-xl px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-950/40" onClick={() => setOpen(false)}>Register</Link>
        </div>
      )}
    </nav>
  )
}