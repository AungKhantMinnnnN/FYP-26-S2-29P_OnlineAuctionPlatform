import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p className="mb-2">Online Auction Platform — CSIT321 FYP</p>
          <p>PDPA Compliant • Secure Bidding • C2C Marketplace</p>
        </div>
      </footer>
    </div>
  )
}