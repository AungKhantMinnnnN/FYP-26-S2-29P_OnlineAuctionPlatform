import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, Menu, X, Gavel } from 'lucide-react'
import SearchBar from './SearchBar'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isPublic = !location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/seller') && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/profile') && !location.pathname.startsWith('/bid-history') && !location.pathname.startsWith('/create-listing')

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-accent-700">
            <Gavel size={24} />
            <span className="font-bold text-lg tracking-tight text-gray-900">AuctionHub</span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <SearchBar />
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/browse" className="text-sm font-medium text-gray-700 hover:text-accent-600">Browse</Link>
            <Link to="/seller-dashboard" className="text-sm font-medium text-gray-700 hover:text-accent-600">Sell</Link>
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-accent-600">Log In</Link>
            <Link to="/register" className="text-sm font-medium px-4 py-2 rounded-lg bg-accent-600 text-white hover:bg-accent-700">Register</Link>
          </div>

          <button className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3">
          <SearchBar />
          <Link to="/browse" className="block text-sm font-medium text-gray-700" onClick={() => setOpen(false)}>Browse Auctions</Link>
          <Link to="/seller-dashboard" className="block text-sm font-medium text-gray-700" onClick={() => setOpen(false)}>Sell an Item</Link>
          <Link to="/login" className="block text-sm font-medium text-gray-700" onClick={() => setOpen(false)}>Log In</Link>
          <Link to="/register" className="block text-sm font-medium text-accent-600" onClick={() => setOpen(false)}>Register</Link>
        </div>
      )}
    </nav>
  )
}