import apiClient from './apiClient'

export interface SubscriptionTierItem {
  id: string
  tier: 'free' | 'premium'
  price: number
  duration_days: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionTiersResponse {
  items: SubscriptionTierItem[]
}

export const getSubscriptionTiers = async (): Promise<SubscriptionTiersResponse> => {
  const response = await apiClient.get<SubscriptionTiersResponse>('/subscription-tiers')
  return response.data
}

export interface SubscriptionActionResponse {
  subscription_tier: string
  subscription_expires_at: string | null
  balance: number
  message: string
}

export const manageSubscription = async (action: 'renew' | 'cancel'): Promise<SubscriptionActionResponse> => {
  const response = await apiClient.post<SubscriptionActionResponse>('/users/me/subscription', { action })
  return response.data
}

export interface ProfileUpdatePayload {
  full_name?: string
  phone?: string
  address?: string
  bio?: string
}

export interface ProfileResponse {
  full_name: string | null
  phone: string | null
  address: string | null
  dob: string | null
  bio: string | null
}

export const updateProfile = async (data: ProfileUpdatePayload): Promise<ProfileResponse> => {
  const response = await apiClient.post<ProfileResponse>('/users/me/profile', data)
  return response.data
}

export interface BidHistoryItem {
  listing_id: string
  listing_title: string
  listing_image_url: string | null
  listing_status: string
  listing_end_time: string
  my_highest_bid: number
  current_price: number
  result: 'won' | 'outbid' | 'leading' | 'active'
  placed_at: string
}

export interface BidHistoryResponse {
  total: number
  page: number
  size: number
  pages: number
  items: BidHistoryItem[]
}

export const getMyBids = async (params?: { page?: number; size?: number; result?: 'all' | 'won' | 'outbid' }): Promise<BidHistoryResponse> => {
  const response = await apiClient.get<BidHistoryResponse>('/users/me/bids', { params })
  return response.data
}

export interface PurchaseItem {
  auction_result_id: string
  listing_id: string
  listing_title: string
  listing_image_url: string | null
  final_price: number
  ended_at: string
}

export interface PurchasesResponse {
  total: number
  page: number
  size: number
  pages: number
  items: PurchaseItem[]
}

export const getMyPurchases = async (params?: { page?: number; size?: number }): Promise<PurchasesResponse> => {
  const response = await apiClient.get<PurchasesResponse>('/users/me/purchases', { params })
  return response.data
}

// ── Watchlist ────────────────────────────────────────────────────────────────

export interface WatchlistListing {
  id: string
  title: string
  description: string | null
  condition: string
  current_price: number
  starting_price: number
  status: string
  start_time: string
  end_time: string
  image_url: string | null
}

export interface WatchlistItem {
  watchlist_id: string
  listing_id: string
  added_at: string
  listing: WatchlistListing
}

export interface WatchlistResponse {
  items: WatchlistItem[]
  listing_ids: string[]
}

export interface WatchlistAddResponse {
  watchlist_id: string
  listing_id: string
  added_at: string
}

export const getMyWatchlist = async (): Promise<WatchlistResponse> => {
  const response = await apiClient.get<WatchlistResponse>('/users/me/watchlist')
  return response.data
}

export const addToWatchlist = async (listing_id: string): Promise<WatchlistAddResponse> => {
  const response = await apiClient.post<WatchlistAddResponse>('/users/me/watchlist', { listing_id })
  return response.data
}

export const removeFromWatchlist = async (listing_id: string): Promise<void> => {
  await apiClient.delete(`/users/me/watchlist/${listing_id}`)
}

// ── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletTransactionItem {
  id: string
  amount: number
  type: string
  reference: string | null
  created_at: string
}

export interface WalletTransactionsPage {
  total: number
  page: number
  size: number
  pages: number
  items: WalletTransactionItem[]
}

export interface WalletResponse {
  balance: number
  transactions: WalletTransactionsPage
}

export const getMyWallet = async (params?: { page?: number; size?: number }): Promise<WalletResponse> => {
  const response = await apiClient.get<WalletResponse>('/users/me/wallet', { params })
  return response.data
}

export const topUpWallet = async (amount: number): Promise<{ balance: number; transaction: WalletTransactionItem }> => {
  const response = await apiClient.post('/users/me/wallet/topup', { amount })
  return response.data
}

// ── Interests ────────────────────────────────────────────────────────────────

export interface InterestCategory {
  id: string
  name: string
  slug: string
}

export interface InterestsResponse {
  items: InterestCategory[]
}

export const getMyInterests = async (): Promise<InterestsResponse> => {
  const response = await apiClient.get<InterestsResponse>('/users/me/interests')
  return response.data
}

export const updateMyInterests = async (category_ids: string[]): Promise<InterestsResponse> => {
  const response = await apiClient.post<InterestsResponse>('/users/me/interests', { category_ids })
  return response.data
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface SellerStatsResponse {
  total_views: number
  total_watchlists: number
  total_sales: number
  total_revenue: number
}

export const getMyStats = async (): Promise<SellerStatsResponse> => {
  const response = await apiClient.get<SellerStatsResponse>('/users/me/stats')
  return response.data
}
