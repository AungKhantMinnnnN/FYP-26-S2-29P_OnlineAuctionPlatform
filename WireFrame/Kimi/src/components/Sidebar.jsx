import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Gavel, Heart, User, History, Store, PlusCircle, Shield, LogOut } from 'lucide-react'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bid-history', label: 'Bid History', icon: History },
  { to: '/seller-dashboard', label: 'Seller Dashboard', icon: Store },
  { to: '/create-listing', label: 'Create Listing', icon: PlusCircle },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/admin-dashboard', label: 'Admin Panel', icon: Shield },
]

export default function Sidebar({ onNavigate }) {
  return (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 mb-6 hidden lg:flex items-center gap-2 text-accent-700 dark:text-accent-300">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-soft dark:bg-accent-500">
          <Gavel size={19} />
        </span>
        <span className="font-bold text-lg text-slate-950 dark:text-slate-50">AuctionHub</span>
      </div>
      <nav className="flex-1 px-2 space-y-1.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-accent-50 text-accent-700 shadow-sm ring-1 ring-accent-100 dark:bg-accent-950/40 dark:text-accent-300 dark:ring-accent-900/50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50'}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-2 mt-auto">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 w-full dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50">
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </div>
  )
}