import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Gavel, ChevronDown, Wallet, CircleUser, Settings, Package, LogOut} from 'lucide-react'
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
    <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <Link to="/" className="group flex items-center gap-2">
            <span className="font-bold text-xl text-accent-600">AuctionHub</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {role !== 'admin' && (
              <Link to="/browse" className="px-3.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-accent-600">Browse</Link>
            )}
            {user ? (
              <div className="relative" onMouseEnter={() => setAccountOpen(true)} onMouseLeave={() => setAccountOpen(false)}>
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="ml-2 flex items-center gap-4 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm transition hover:bg-slate-50"
                >
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-semibold text-slate-800">
                      {accountLabel}
                    </span>

                    <span className="text-xs text-slate-500">
                      {role === 'admin' ? 'Admin' : role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                    <CircleUser size={22} className="text-slate-700" />
                    <ChevronDown size={16} className="text-slate-500" />
                  </div>
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full w-56 pt-2">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      {role === 'admin' ? (
                        <button onClick={handleLogout} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">Logout</button>
                      ) : (
                        <>
                          <div className="border-b border-slate-200 px-3 py-3">
                            <p className="font-semibold text-slate-900">
                              {accountLabel}
                            </p>

                            <p className="text-xs text-slate-500">
                              {user?.email}
                            </p>
                          </div>

                          <Link to="/wallet" onClick={() => setAccountOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            <span className="inline-flex items-center gap-2">
                              <Wallet size={15} />Balance</span>
                            <span className="font-semibold">${balance.toFixed(2)}</span>
                          </Link>

                          <Link to="/wallet/top-up" onClick={() => setAccountOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Top Up
                          </Link>

                          <Link to="/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            <Settings size={16} />
                            Settings
                          </Link>

                          <div className="my-1 border-t border-slate-200"></div>
                          <Link to="/my-auctions" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            <Package size={16} />
                            My Auctions
                          </Link>

                          <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                            <LogOut size={16} />
                            Sign Out
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-accent-600">Sign In</Link>
                <Link to="/register" className="ml-1 rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110">Get Started</Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {role === 'user' && (
        <div className="border-t border-slate-200/50 bg-white/80">
          <div className="max-w-[1280px] mx-auto px-4 py-2 sm:px-8">
            <MarketplaceNav compact />
          </div>
        </div>
      )}

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1.5 shadow-xl">
          <SearchBar />
          {!user && (
            <Link to="/browse" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setOpen(false)}>Browse Auctions</Link>
          )}
          {user ? (
            <>
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900">
                {accountLabel} {role === 'admin' && <span className="ml-2 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] text-accent-700">ADMIN</span>}
              </div>
              {role === 'admin' ? (
                <button className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={handleLogout}>Logout</button>
              ) : (
                <>
                  <Link to="/wallet" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setOpen(false)}>Balance: ${balance.toFixed(2)}</Link>
                  <Link to="/wallet/top-up" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setOpen(false)}>Top Up</Link>
                  <button className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={handleLogout}>Sign Out</button>
                </>
              )}
            </>
          ) : (
            <>
              <Link to="/login" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setOpen(false)}>Sign In</Link>
              <Link to="/register" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-accent-700 hover:bg-accent-50" onClick={() => setOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
