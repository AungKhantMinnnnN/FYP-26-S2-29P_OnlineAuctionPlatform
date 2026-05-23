import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Gavel, LogOut, Menu, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import MarketplaceNav from '../components/MarketplaceNav'
import { useAuth } from '../context/AuthContext'

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { role, logout } = useAuth()
  const navigate = useNavigate()

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between gap-4">
              <Link to="/browse" className="group flex items-center gap-2 text-accent-700 dark:text-accent-300">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-soft transition-transform group-hover:-rotate-6 group-hover:scale-105 dark:bg-accent-500">
                  <Gavel size={20} />
                </span>
                <span className="hidden font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:inline">AuctionHub</span>
              </Link>

              <div className="min-w-0 flex-1">
                <MarketplaceNav compact />
              </div>

              <button
                onClick={() => { logout(); navigate('/') }}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 dark:bg-slate-100 dark:text-slate-950"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex dark:bg-slate-950 dark:text-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/95 border-r border-slate-200/80 shadow-2xl shadow-slate-900/10 backdrop-blur transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col lg:w-64 lg:shadow-none dark:bg-slate-950/95 dark:border-slate-800 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/80 lg:hidden dark:border-slate-800">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Menu</span>
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-100"><X size={20} /></button>
        </div>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex items-center justify-between h-16 px-4">
            <span className="font-semibold text-slate-900 dark:text-slate-100">AuctionHub</span>
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-100"><Menu size={20} /></button>
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