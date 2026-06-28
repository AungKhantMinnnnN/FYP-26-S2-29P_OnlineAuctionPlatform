import { Outlet, Link } from 'react-router-dom'
import { Mail, MapPin } from 'lucide-react'
import Navbar from '../components/Navbar'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fb] text-slate-950">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-auto bg-slate-200/60 border-t border-slate-300/50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-12 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {/* Brand Column */}
            <div className="col-span-2">
              <div className="font-bold text-xl text-accent-600 mb-4">AuctionHub</div>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-4">
                Singapore's trusted peer-to-peer auction platform for buying and selling unique items securely.
              </p>
              <p className="text-xs text-slate-400">PDPA Compliant &middot; Secure Bidding &middot; C2C Marketplace</p>
            </div>

            {/* Marketplace Column */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-950 mb-4">Marketplace</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link to="/browse" className="transition-colors hover:text-accent-600">Live Auctions</Link></li>
                <li><Link to="/browse" className="transition-colors hover:text-accent-600">Categories</Link></li>
                <li><Link to="/register" className="transition-colors hover:text-accent-600">Sell an Item</Link></li>
                <li><Link to="/login" className="transition-colors hover:text-accent-600">Sign In</Link></li>
              </ul>
            </div>

            {/* Company / Contact Column */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-950 mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li className="flex items-center gap-2"><MapPin size={14} className="text-slate-400 flex-shrink-0" /> Singapore</li>
                <li className="flex items-center gap-2"><Mail size={14} className="text-slate-400 flex-shrink-0" /> support@auctionhub.sg</li>
                <li><span className="transition-colors hover:text-accent-600 cursor-pointer">Help Center</span></li>
                <li><span className="transition-colors hover:text-accent-600 cursor-pointer">Trust & Safety</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-300/50">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} AuctionHub Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
