import { NavLink } from 'react-router-dom'
import { Crown } from 'lucide-react'

const marketplaceLinks = [
  { to: '/browse',           label: 'Auctions',       badge: null },
  { to: '/activity',         label: 'User History',         badge: null },
  { to: '/collector-board',  label: 'Collector Board',  badge: 'PRO' },
  { to: '/support',          label: 'Support',          badge: null },
]

interface MarketplaceNavProps {
  compact?: boolean
  onNavigate?: () => void
}

export default function MarketplaceNav({ onNavigate }: MarketplaceNavProps) {
  return (
    <nav className="flex items-center gap-8">
      {marketplaceLinks.map(({ to, label, badge }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `relative flex items-center gap-1 pb-2 text-sm font-medium transition-colors ${
              isActive
                ? 'text-accent-700 after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-accent-600'
                : 'text-slate-600 hover:text-accent-700'
            }`
          }
        >
          {label}
          {badge && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 ring-1 ring-amber-200">
              <Crown size={8} />
              {badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}