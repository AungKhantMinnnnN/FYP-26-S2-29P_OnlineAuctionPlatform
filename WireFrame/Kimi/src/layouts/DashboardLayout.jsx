import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 lg:hidden">
          <span className="font-semibold text-gray-900">Menu</span>
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded-md text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </div>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <span className="font-semibold text-gray-900">AuctionHub</span>
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md text-gray-500 hover:bg-gray-100"><Menu size={20} /></button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/25 lg:hidden" onClick={() => setMobileOpen(false)} />}
    </div>
  )
}