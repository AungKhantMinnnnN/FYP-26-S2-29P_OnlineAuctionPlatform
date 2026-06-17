import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Gavel, ChevronDown, Wallet } from 'lucide-react'
import SearchBar from './SearchBar'
import { useAuth } from '../context/AuthContext'
import MarketplaceNav from './MarketplaceNav'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    setOpen(false)
    setAccountOpen(false)
    navigate('/')
  }

  const accountLabel = user?.username || user?.email || 'Account'
  const balance = user?.balance ?? 0

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

          {/* <div className="hidden md:flex flex-1 max-w-md mx-8">
            <SearchBar />
          </div> */}

          <div className="hidden md:flex items-center gap-1">
            {role !== 'admin' && (
              <Link to="/browse" className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent-300">Browse</Link>
            )}
            {user ? (
              <div className="relative" onMouseEnter={() => setAccountOpen(true)} onMouseLeave={() => setAccountOpen(false)}>
                <button onClick={() => setAccountOpen(!accountOpen)} className="ml-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 dark:bg-slate-100 dark:text-slate-950">
                  <span>{role === 'admin' ? 'Admin' : accountLabel}</span>
                  {role === 'admin' && <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] font-bold text-accent-200 dark:text-accent-700">ADMIN</span>}
                  <ChevronDown size={15} />
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full w-56 pt-2">
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950">
                      {role === 'admin' ? (
                        <button onClick={handleLogout} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">Logout</button>
                      ) : (
                        <>
                          <Link to="/wallet" onClick={() => setAccountOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900">
                            <span className="inline-flex items-center gap-2"><Wallet size={15} /> Balance</span>
                            <span className="font-semibold text-slate-950 dark:text-slate-50">${balance.toFixed(2)}</span>
                          </Link>
                          <Link to="/wallet/top-up" onClick={() => setAccountOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900">Top Up</Link>
                          <button onClick={handleLogout} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">Sign Out</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent-300">Log In</Link>
                <Link to="/register" className="ml-2 rounded-full bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:bg-accent-500 dark:hover:bg-accent-400 dark:focus:ring-offset-slate-950">Register</Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-100" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {role === 'user' && (
        <div className="border-t border-slate-200/70 bg-white/70 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
            <MarketplaceNav compact />
          </div>
        </div>
      )}

      {open && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 px-4 py-4 space-y-2 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <SearchBar />
          {!user && (
            <Link to="/browse" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>Browse Auctions</Link>
          )}
          {user ? (
            <>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                {accountLabel} {role === 'admin' && <span className="ml-2 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] text-accent-700 dark:bg-accent-950 dark:text-accent-300">ADMIN</span>}
              </div>
              {role === 'admin' ? (
                <button className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={handleLogout}>Logout</button>
              ) : (
                <>
                  <Link to="/wallet" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>Balance: ${balance.toFixed(2)}</Link>
                  <Link to="/wallet/top-up" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>Top Up</Link>
                  <button className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={handleLogout}>Sign Out</button>
                </>
              )}
            </>
          ) : (
            <>
              <Link to="/login" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setOpen(false)}>Log In</Link>
              <Link to="/register" className="block rounded-xl px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-950/40" onClick={() => setOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}