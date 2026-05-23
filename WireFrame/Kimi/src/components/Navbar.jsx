import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Gavel } from 'lucide-react'
import SearchBar from './SearchBar'
import { useAuth } from '../context/AuthContext'
import MarketplaceNav from './MarketplaceNav'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

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
            {user?.role === 'admin' && <Link to="/admin-dashboard" className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent-300">Admin</Link>}
            {user ? <button onClick={logout} className="ml-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 dark:bg-slate-100 dark:text-slate-950">Logout</button> : <><Link to="/login" className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent-300">Log In</Link><Link to="/register" className="ml-2 rounded-full bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:bg-accent-500 dark:hover:bg-accent-400 dark:focus:ring-offset-slate-950">Register</Link></>}
          </div>

          <button className="md:hidden p-2 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-100" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {user?.role === 'user' && (
        <div className="border-t border-slate-200/70 bg-white/70 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
            <MarketplaceNav compact />
          </div>
        </div>
      )}

      {open && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 px-4 py-4 space-y-2 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <SearchBar />
          {!user && <Link to="/browse" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>Browse Auctions</Link>}
          {user ? <><Link to={user.role === 'admin' ? '/admin-dashboard' : '/browse'} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>{user.role === 'admin' ? 'Admin Dashboard' : 'Products'}</Link><button className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => { logout(); setOpen(false) }}>Logout</button></> : <><Link to="/login" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>Log In</Link><Link to="/register" className="block rounded-xl px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-950/40" onClick={() => setOpen(false)}>Register</Link></>}
        </div>
      )}
    </nav>
  )
}