import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
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
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import WatchlistPage from './pages/WatchlistPage'
import WalletPage from './pages/WalletPage'

import AdminManagementPage from './pages/AdminManagementPage'
import ProtectedRoute from './components/ProtectedRoute'

import SupportPage from './pages/SupportPage'
import SupportSuccessPage from './pages/SupportSuccessPage'
import TestimonialSuccessPage from './pages/TestimonialSuccessPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            {/*<Route path="/browse" element={<BrowseAuctionsPage />} /> */}
            <Route path="/auction/:id" element={<AuctionDetailPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
          </Route>
          
          {/* User routes */}
          <Route element={<ProtectedRoute roles={['user']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/browse" element={<BrowseAuctionsPage />} />
              <Route path="/dashboard" element={<UserDashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/bid-history" element={<BidHistoryPage />} />
              <Route path="/seller-dashboard" element={<SellerDashboardPage />} />
              <Route path="/create-listing" element={<ListingFormPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/wallet/top-up" element={<WalletPage mode="top-up" />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/support/success" element={<SupportSuccessPage />} />
              <Route path="/testimonial/success" element={<TestimonialSuccessPage />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/:section" element={<AdminManagementPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  )
}
