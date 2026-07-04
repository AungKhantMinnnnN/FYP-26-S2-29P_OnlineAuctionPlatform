import { NavLink } from 'react-router-dom'

const marketplaceLinks = [
  { to: '/browse', label: 'Categories' },
  { to: '/auctions', label: 'Auctions' },
  { to: '/bid-history', label: 'Activity' },
  { to: '/support', label: 'Support' },
]

interface MarketplaceNavProps {
  compact?: boolean
  onNavigate?: () => void
}

export default function MarketplaceNav({ onNavigate }: MarketplaceNavProps) {
  return (
    <nav className="flex items-center gap-8">
      {marketplaceLinks.map(({ to, label }) => (
        <NavLink
          key={label}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `relative pb-2 text-sm font-medium transition-colors ${
              isActive
                ? 'text-accent-700 after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-accent-600'
                : 'text-slate-600 hover:text-accent-700'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}