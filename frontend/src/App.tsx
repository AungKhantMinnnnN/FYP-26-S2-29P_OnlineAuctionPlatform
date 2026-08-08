import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import LandingPage from './pages/LandingPage'
import CmsPage from './cms/CmsPage'
import BrowseAuctionsPage from './pages/BrowseAuctionsPage'
import AuctionDetailPage from './pages/AuctionDetailPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import UserDashboardPage from './pages/UserDashboardPage'
import ProfilePage from './pages/ProfilePage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import ListingFormPage from './pages/ListingFormPage'
import AdminLoginPage from './pages/AdminLoginPage'
import WatchlistPage from './pages/WatchlistPage'
import WalletPage from './pages/WalletPage'
import ChooseInterestsPage from './pages/ChooseInterestsPage'
import UserActivityPage from './pages/UserActivityPage'
import CollectorBoardPage from './pages/CollectorBoardPage';

import AdminManagementPage from './pages/AdminManagementPage'
import AdminCmsPage from './pages/AdminCmsPage'
import ProtectedRoute from './components/ProtectedRoute'

import SupportPage from './pages/SupportPage'
import SupportSuccessPage from './pages/SupportSuccessPage'
import TestimonialSuccessPage from './pages/TestimonialSuccessPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
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
            <Route path="/" element={<CmsPage slug="landing" />} />
            {/* Legacy landing page, kept until CmsPage parity is confirmed */}
            <Route path="/landing-legacy" element={<LandingPage />} />
            <Route path="/browse" element={<BrowseAuctionsPage />} />
            <Route path="/auction/:id" element={<AuctionDetailPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>
          
          {/* Onboarding (protected, standalone — no dashboard layout) */}
          <Route element={<ProtectedRoute roles={['user']} />}>
            <Route path="/onboarding/interests" element={<ChooseInterestsPage />} />
          </Route>

          {/* User routes */}
          <Route element={<ProtectedRoute roles={['user']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/activity" element={<UserActivityPage />} />
              <Route path="/collector-board" element={<CollectorBoardPage />} />
              <Route path="/dashboard" element={<UserDashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/seller-dashboard" element={<SellerDashboardPage />} />
              <Route path="/create-listing" element={<ListingFormPage />} />
              <Route path="/edit-listing/:id" element={<ListingFormPage />} />
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
              <Route path="/admin-dashboard" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/:section" element={<AdminManagementPage />} />
            </Route>
          </Route>

          {/* Admin CMS editor (protected, standalone — full-bleed Puck canvas, no dashboard chrome) */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin/cms" element={<AdminCmsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  )
}
