import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Gavel, User, History, Store, PlusCircle, Shield, Users, Tags, FileWarning, ScrollText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['user'] },
  { to: '/bid-history', label: 'Bid History', icon: History, roles: ['user'] },
  { to: '/seller-dashboard', label: 'Seller Dashboard', icon: Store, roles: ['user'] },
  { to: '/create-listing', label: 'Create Listing', icon: PlusCircle, roles: ['user'] },
  { to: '/profile', label: 'Profile', icon: User, roles: ['user'] },
  { to: '/admin-dashboard', label: 'Admin Panel', icon: Shield, roles: ['admin'] },
  { to: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/admin/listings', label: 'Listings', icon: Gavel, roles: ['admin'] },
  { to: '/admin/categories', label: 'Categories', icon: Tags, roles: ['admin'] },
  { to: '/admin/cases', label: 'Cases', icon: FileWarning, roles: ['admin'] },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, roles: ['admin'] },
]

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { role = '' } = useAuth()
  const visibleLinks = links.filter((link) => link.roles.includes(role))

  return (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 mb-6 hidden lg:flex items-center gap-2 text-accent-700">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-soft">
          <Gavel size={19} />
        </span>
        <span className="font-bold text-lg text-slate-950">AuctionHub</span>
      </div>
      <nav className="flex-1 px-2 space-y-1.5">
        {visibleLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent-50 text-accent-700 shadow-sm ring-1 ring-accent-100'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}