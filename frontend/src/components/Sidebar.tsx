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
      <div className="px-4 mb-6 hidden lg:flex items-center gap-2 text-accent-700">
        <Gavel size={22} />
        <span className="font-bold text-lg text-gray-900">AuctionHub</span>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-accent-50 text-accent-700' : 'text-gray-700 hover:bg-gray-100'}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-2 mt-auto">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 w-full">
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </div>
  )
}