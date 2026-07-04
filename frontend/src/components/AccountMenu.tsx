import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Wallet, User as UserIcon, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Shared account dropdown for non-admin users. Used by both Navbar (public pages)
 * and DashboardLayout (protected pages) so the trigger label and menu items stay
 * uniform everywhere without duplicating markup.
 */
export default function AccountMenu() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const displayName = user?.profile?.full_name || user?.username || user?.email || 'Account'

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
      >
        <span>{displayName}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full w-56 pt-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <Link to="/wallet" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Wallet size={15} /> Wallet
            </Link>
            <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <UserIcon size={15} /> Profile
            </Link>
            <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
