import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Gavel, LogOut, Menu, X, ChevronDown, ShieldCheck, Bell, Search } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import MarketplaceNav from '../components/MarketplaceNav'
import { useAuth } from '../context/AuthContext'

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between gap-4">
              <Link to="/browse" className="group flex items-center gap-2 text-accent-700">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-soft transition-transform group-hover:-rotate-6 group-hover:scale-105">
                  <Gavel size={20} />
                </span>
                <span className="hidden font-bold tracking-tight text-slate-950 sm:inline">AuctionHub</span>
              </Link>

              <div className="hidden md:flex min-w-0 flex-1 items-center justify-center">
                <MarketplaceNav compact />
              </div>

              <div className="hidden lg:flex w-72 items-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-500">
                <Search size={16} className="mr-2" />
                <input
                  type="text"
                  placeholder="Search rarities..."
                  className="w-full bg-transparent outline-none placeholder:text-slate-400"
                />
              </div>

            <button className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-accent-700">
              <Bell size={17} />
            </button>

              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    )
  }

  const isAdmin = role === 'admin'
  const adminName = user?.username || user?.email || 'Administrator'

  const handleLogout = () => {
    logout()
    setAccountOpen(false)
    setMobileOpen(false)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/95 border-r border-slate-200/80 shadow-2xl shadow-slate-900/10 backdrop-blur transform transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 lg:flex lg:flex-col lg:w-64 lg:shadow-none lg:overflow-y-auto ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/80 lg:hidden">
          <span className="font-semibold text-slate-900">Menu</span>
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"><X size={20} /></button>
        </div>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur ${isAdmin ? '' : 'lg:hidden'}`}>
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"><Menu size={20} /></button>
              <div>
                <span className="font-semibold text-slate-900">{isAdmin ? 'Admin Console' : 'AuctionHub'}</span>
                {isAdmin && <p className="hidden text-xs text-slate-500 sm:block">Platform administration workspace</p>}
              </div>
            </div>

            {isAdmin && (
              <div className="relative">
                <button onClick={() => setAccountOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:text-accent-700">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-50 text-accent-700"><ShieldCheck size={17} /></span>
                  <span className="hidden text-left sm:block">
                    <span className="block leading-4">{adminName}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-accent-600">Admin</span>
                  </span>
                  <ChevronDown size={15} className={`transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full w-64 pt-2">
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-slate-900/10">
                      <div className="mb-1 rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-950">{adminName}</p>
                        <p className="text-xs text-slate-500">{user?.email || 'Admin account'}</p>
                      </div>
                      <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
                        <LogOut size={15} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
    </div>
  )

}