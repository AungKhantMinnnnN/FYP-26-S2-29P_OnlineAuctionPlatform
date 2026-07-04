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
