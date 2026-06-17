import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-auto border-t border-slate-200/80 bg-white/80 py-8 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p className="mb-2 font-medium text-slate-700 dark:text-slate-200">Online Auction Platform — CSIT321 FYP</p>
          <p>PDPA Compliant • Secure Bidding • C2C Marketplace</p>
        </div>
      </footer>
    </div>
  )
}