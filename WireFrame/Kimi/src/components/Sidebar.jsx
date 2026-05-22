import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Gavel, User, History, Store, PlusCircle, Shield, LogOut, Users, Tags, FileWarning, ScrollText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['bidder', 'seller'] },
  { to: '/bid-history', label: 'Bid History', icon: History, roles: ['bidder', 'seller'] },
  { to: '/seller-dashboard', label: 'Seller Dashboard', icon: Store, roles: ['seller'] },
  { to: '/create-listing', label: 'Create Listing', icon: PlusCircle, roles: ['seller'] },
  { to: '/profile', label: 'Profile', icon: User, roles: ['bidder', 'seller'] },
  { to: '/admin-dashboard', label: 'Admin Panel', icon: Shield, roles: ['admin'] },
  { to: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/admin/listings', label: 'Listings', icon: Gavel, roles: ['admin'] },
  { to: '/admin/categories', label: 'Categories', icon: Tags, roles: ['admin'] },
  { to: '/admin/cases', label: 'Cases', icon: FileWarning, roles: ['admin'] },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, roles: ['admin'] },
]

export default function Sidebar({ onNavigate }) {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const visibleLinks = links.filter((link) => link.roles.includes(role))
  return (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 mb-6 hidden lg:flex items-center gap-2 text-accent-700 dark:text-accent-300">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-soft dark:bg-accent-500">
          <Gavel size={19} />
        </span>
        <span className="font-bold text-lg text-slate-950 dark:text-slate-50">AuctionHub</span>
      </div>
      <nav className="flex-1 px-2 space-y-1.5">
        {visibleLinks.map(({ to, label, icon: Icon }) => (
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
        <button onClick={() => { logout(); navigate('/') }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 w-full dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50">
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </div>
  )
}