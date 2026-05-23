import { NavLink } from 'react-router-dom'
import { Grid3X3, History, LayoutDashboard, PlusCircle, Store, User } from 'lucide-react'

const marketplaceLinks = [
  { to: '/browse', label: 'Products', icon: Grid3X3 },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bid-history', label: 'Bid History', icon: History },
  { to: '/seller-dashboard', label: 'Seller Dashboard', icon: Store },
  { to: '/create-listing', label: 'Create Listing', icon: PlusCircle },
  { to: '/profile', label: 'Profile', icon: User },
]

interface MarketplaceNavProps {
  compact?: boolean
  onNavigate?: () => void
}

export default function MarketplaceNav({ compact = false, onNavigate }: MarketplaceNavProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {marketplaceLinks.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              compact ? 'px-2.5 py-1.5 text-xs' : ''
            } ${
              isActive
                ? 'bg-accent-600 text-white shadow-soft dark:bg-accent-500 dark:text-slate-950'
                : 'text-slate-700 hover:bg-slate-100 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent-300'
            }`
          }
        >
          <Icon size={compact ? 14 : 16} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
