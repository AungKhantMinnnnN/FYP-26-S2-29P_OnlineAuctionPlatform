import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

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