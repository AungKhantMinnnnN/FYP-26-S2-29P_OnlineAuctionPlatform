import apiClient from './apiClient'

export interface FeedbackType {
  id: string
  name: string
  reviewer_role: 'buyer' | 'seller'
  is_active: boolean
  created_at: string
}

export interface FeedbackUserInfo {
  id: string
  username: string
}

export interface FeedbackListingInfo {
  id: string
  title: string
}

export interface FeedbackItem {
  id: string
  listing_id: string
  reviewer_id: string
  reviewee_id: string
  feedback_type_id: string
  rating: number
  comment: string | null
  is_public: boolean
  created_at: string
  reviewer: FeedbackUserInfo | null
  reviewee: FeedbackUserInfo | null
  feedback_type: FeedbackType | null
  listing: FeedbackListingInfo | null
}

export interface FeedbackCreate {
  listing_id: string
  reviewee_id: string
  feedback_type_id: string
  rating: number
  comment?: string
}

export interface EligibilityResponse {
  eligible_type_ids: string[]
  already_submitted_type_ids: string[]
  seller_id?: string
}

export interface FeedbackTypeCreate {
  name: string
  reviewer_role: 'buyer' | 'seller'
}

export interface FeedbackTypeUpdate {
  name?: string
  is_active?: boolean
}

// ── Public ────────────────────────────────────────────────────────────────────

export const getFeedbackTypes = async (): Promise<FeedbackType[]> => {
  const res = await apiClient.get<FeedbackType[]>('/feedback/types')
  return res.data
}

export const getPublicFeedback = async (limit = 10): Promise<FeedbackItem[]> => {
  const res = await apiClient.get<FeedbackItem[]>('/feedback/public', { params: { limit } })
  return res.data
}

export const getListingFeedback = async (listingId: string): Promise<FeedbackItem[]> => {
  const res = await apiClient.get<FeedbackItem[]>(`/feedback/listing/${listingId}`)
  return res.data
}

export const getUserFeedback = async (userId: string): Promise<FeedbackItem[]> => {
  const res = await apiClient.get<FeedbackItem[]>(`/feedback/user/${userId}`)
  return res.data
}

// ── Authenticated ─────────────────────────────────────────────────────────────

export const checkFeedbackEligibility = async (listingId: string): Promise<EligibilityResponse> => {
  const res = await apiClient.get<EligibilityResponse>(`/feedback/me/eligibility/${listingId}`)
  return res.data
}

export const submitFeedback = async (data: FeedbackCreate): Promise<FeedbackItem> => {
  const res = await apiClient.post<FeedbackItem>('/feedback/', data)
  return res.data
}

export const getMySubmittedFeedback = async (): Promise<FeedbackItem[]> => {
  const res = await apiClient.get<FeedbackItem[]>('/feedback/me/submitted')
  return res.data
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getAllFeedbackTypes = async (): Promise<FeedbackType[]> => {
  const res = await apiClient.get<FeedbackType[]>('/feedback/types/all')
  return res.data
}

export const createFeedbackType = async (data: FeedbackTypeCreate): Promise<FeedbackType> => {
  const res = await apiClient.post<FeedbackType>('/feedback/types', data)
  return res.data
}

export const updateFeedbackType = async (id: string, data: FeedbackTypeUpdate): Promise<FeedbackType> => {
  const res = await apiClient.patch<FeedbackType>(`/feedback/types/${id}`, data)
  return res.data
}

export const deleteFeedbackType = async (id: string): Promise<void> => {
  await apiClient.delete(`/feedback/types/${id}`)
}
