import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Gavel, User, Activity, Store, PlusCircle, Shield, Users, Tags, FileWarning, ScrollText, LayoutGrid } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['user'], badge: null },
  { to: '/activity', label: 'Activity', icon: Activity, roles: ['user'], badge: null },
  { to: '/seller-dashboard', label: 'Seller Dashboard', icon: Store, roles: ['user'], badge: null },
  { to: '/create-listing', label: 'Create Listing', icon: PlusCircle, roles: ['user'], badge: null },
  { to: '/collector-board', label: 'Collector Board', icon: LayoutGrid, roles: ['user'], badge: 'PRO' },
  { to: '/profile', label: 'Profile', icon: User, roles: ['user'], badge: null },
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
        {visibleLinks.map(({ to, label, icon: Icon, badge }) => (
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
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 ring-1 ring-amber-200">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}