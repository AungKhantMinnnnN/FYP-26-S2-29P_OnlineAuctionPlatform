import apiClient from '../api/apiClient'

export type UserAccountStatus = 'active' | 'suspended' | 'deleted'
export type UserRole = 'user' | 'admin'

export interface AdminUserSummary {
  id: string
  username: string
  email: string
  role: UserRole
  status: UserAccountStatus
  created_at: string
}

export interface AdminUserProfile {
  full_name: string | null
  phone: string | null
  address: string | null
  dob: string | null
  bio: string | null
}

export interface AdminUserDetails extends AdminUserSummary {
  subscription_tier: 'free' | 'premium'
  balance: number
  suspended_at: string | null
  suspension_reason: string | null
  profile: AdminUserProfile | null
}

export interface AdminUsersResponse {
  items: AdminUserSummary[]
  total: number
  page: number
  size: number
  pages: number
}

export interface SuspendUserRequest {
  reason: string
}

export const adminUsersApi = {
  async getUsers(
    search = '',
    page = 1,
    size = 10,
    status?: UserAccountStatus,
  ): Promise<AdminUsersResponse> {
    const response = await apiClient.get<AdminUsersResponse>(
      '/admin/users',
      {
        params: {
          search: search || undefined,
          page,
          size,
          status,
        },
      },
    )

    return response.data
  },

  async getUserById(
    userId: string,
  ): Promise<AdminUserDetails> {
    const response = await apiClient.get<AdminUserDetails>(
      `/admin/users/${userId}`,
    )

    return response.data
  },

  async suspendUser(
    userId: string,
    data: SuspendUserRequest,
  ): Promise<AdminUserDetails> {
    const response = await apiClient.patch<AdminUserDetails>(
      `/admin/users/${userId}/suspend`,
      data,
    )

    return response.data
  },

  async unsuspendUser(
    userId: string,
  ): Promise<AdminUserDetails> {
    const response = await apiClient.patch<AdminUserDetails>(
      `/admin/users/${userId}/unsuspend`,
    )

    return response.data
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`)
  },
}