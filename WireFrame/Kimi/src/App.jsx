import { Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import LandingPage from './pages/LandingPage'
import BrowseAuctionsPage from './pages/BrowseAuctionsPage'
import AuctionDetailPage from './pages/AuctionDetailPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import UserDashboardPage from './pages/UserDashboardPage'
import ProfilePage from './pages/ProfilePage'
import BidHistoryPage from './pages/BidHistoryPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import ListingFormPage from './pages/ListingFormPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminManagementPage from './pages/AdminManagementPage'
import WatchlistPage from './pages/WatchlistPage'
import WalletPage from './pages/WalletPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/browse" element={<BrowseAuctionsPage />} />
        <Route path="/auction/:id" element={<AuctionDetailPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['user']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<UserDashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/bid-history" element={<BidHistoryPage />} />
        <Route path="/seller-dashboard" element={<SellerDashboardPage />} />
        <Route path="/create-listing" element={<ListingFormPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/wallet/top-up" element={<WalletPage mode="top-up" />} />
      </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['admin']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/:section" element={<AdminManagementPage />} />
      </Route>
      </Route>
    </Routes>
  )
}