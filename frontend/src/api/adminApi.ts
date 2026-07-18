import apiClient, { biddingClient, recsClient } from './apiClient'
import type { TestimonialResponse } from './supportApi'

// ── Service Health ───────────────────────────────────────────────────────────────
// Each microservice exposes its own /health route; there's no aggregate backend
// endpoint, so the admin UI pings all three directly and reports what came back.

export interface ServiceHealthStatus {
  name: string
  status: 'up' | 'down'
  detail?: string
  latencyMs?: number
}

export const checkServicesHealth = async (): Promise<ServiceHealthStatus[]> => {
  const targets: { name: string; client: typeof apiClient; path: string }[] = [
    { name: 'API Gateway', client: apiClient, path: '/health' },
    { name: 'Bidding Engine', client: biddingClient, path: '/bids/health' },
    { name: 'Recommendation Engine', client: recsClient, path: '/recs/health' },
  ]

  return Promise.all(
    targets.map(async ({ name, client, path }) => {
      const start = performance.now()
      try {
        await client.get(path, { timeout: 5000 })
        return { name, status: 'up' as const, latencyMs: Math.round(performance.now() - start) }
      } catch (error: any) {
        return {
          name,
          status: 'down' as const,
          detail: error?.response ? `HTTP ${error.response.status}` : 'Unreachable',
        }
      }
    }),
  )
}

// ── Platform Activity Stats ─────────────────────────────────────────────────────

export interface RegistrationsByDay {
  date: string
  count: number
}

export interface AdminStatsResponse {
  total_users: number
  active_auctions: number
  total_bids: number
  revenue: number
  suspended_users: number
  new_registrations: RegistrationsByDay[]
}

// ── System Logs ─────────────────────────────────────────────────────────────────
// Tails the API Gateway's own rotating log file (see backend app.core.logger); the
// bidding-engine and recommendation-engine run in separate containers with no shared
// log volume, so their activity isn't included here.

export interface SystemLogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  service: string
  message: string
}

export interface SystemLogsResponse {
  items: SystemLogEntry[]
  total: number
  page: number
  size: number
  pages: number
}

// ── Audit Logs (admin action log) ───────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  admin_id: string
  admin_username: string | null
  action: string
  target_id: string | null
  details: string | null
  created_at: string
}

export interface AuditLogsResponse {
  items: AuditLogEntry[]
  total: number
  page: number
  size: number
  pages: number
}

// ── Categories ───────────────────────────────────────────────────────────────────

export interface AdminCategory {
  id: string
  name: string
  slug: string
  parent_id: string | null
  is_active: boolean
}

export interface CategoryCreatePayload {
  name: string
  slug: string
  parent_id?: string | null
  is_active?: boolean
}

export interface CategoryUpdatePayload {
  name?: string
  slug?: string
  parent_id?: string | null
  is_active?: boolean
}

export interface CategoryDeleteResponse {
  id: string
  action: 'deleted' | 'deactivated'
}

// ── Disputes (Support Cases) ──────────────────────────────────────────────────────

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'closed'

export interface AdminDispute {
  id: string
  reporter_id: string
  listing_id: string | null
  issue_type_id: string | null
  subject: string | null
  category: string
  description: string
  status: DisputeStatus
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
}

export interface DisputeRespondPayload {
  status: DisputeStatus
  resolution_note?: string
}

// ── API (admin-only) ─────────────────────────────────────────────────────────────

export const getPlatformStats = async (): Promise<AdminStatsResponse> => {
  const res = await apiClient.get<AdminStatsResponse>('/admin/stats')
  return res.data
}

export const getSystemLogs = async (
  params?: { page?: number; size?: number; level?: string; service?: string }
): Promise<SystemLogsResponse> => {
  const res = await apiClient.get<SystemLogsResponse>('/admin/system-logs', { params })
  return res.data
}

export const getAuditLogs = async (
  params?: { page?: number; size?: number; admin_id?: string; action?: string }
): Promise<AuditLogsResponse> => {
  const res = await apiClient.get<AuditLogsResponse>('/admin/logs', { params })
  return res.data
}

// ── Content Moderation ──────────────────────────────────────────────────────────

export interface ProhibitedKeyword {
  id: string
  keyword: string
  added_by_username: string | null
  created_at: string
}

export const getProhibitedKeywords = async (): Promise<ProhibitedKeyword[]> => {
  const res = await apiClient.get<ProhibitedKeyword[]>('/admin/prohibited-keywords')
  return res.data
}

export const createProhibitedKeyword = async (keyword: string): Promise<ProhibitedKeyword> => {
  const res = await apiClient.post<ProhibitedKeyword>('/admin/prohibited-keywords', { keyword })
  return res.data
}

export const deleteProhibitedKeyword = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/prohibited-keywords/${id}`)
}

export interface FlaggedAttempt {
  id: string
  user_id: string
  username: string | null
  keyword_matched: string
  field: string
  attempted_text: string
  created_at: string
}

export interface FlaggedAttemptsResponse {
  items: FlaggedAttempt[]
  total: number
  page: number
  size: number
  pages: number
}

export const getFlaggedAttempts = async (
  params?: { page?: number; size?: number }
): Promise<FlaggedAttemptsResponse> => {
  const res = await apiClient.get<FlaggedAttemptsResponse>('/admin/flagged-attempts', { params })
  return res.data
}

export const getAdminCategories = async (): Promise<AdminCategory[]> => {
  const res = await apiClient.get<AdminCategory[]>('/admin/categories')
  return res.data
}

export const createAdminCategory = async (data: CategoryCreatePayload): Promise<AdminCategory> => {
  const res = await apiClient.post<AdminCategory>('/admin/categories', data)
  return res.data
}

export const updateAdminCategory = async (id: string, data: CategoryUpdatePayload): Promise<AdminCategory> => {
  const res = await apiClient.patch<AdminCategory>(`/admin/categories/${id}`, data)
  return res.data
}

export const deleteAdminCategory = async (id: string): Promise<CategoryDeleteResponse> => {
  const res = await apiClient.delete<CategoryDeleteResponse>(`/admin/categories/${id}`)
  return res.data
}

export const getAdminDisputes = async (status?: DisputeStatus): Promise<AdminDispute[]> => {
  const res = await apiClient.get<AdminDispute[]>('/disputes/', {
    params: status ? { status } : undefined,
  })
  return res.data
}

export const respondToDispute = async (
  id: string,
  data: DisputeRespondPayload,
): Promise<AdminDispute> => {
  const res = await apiClient.post<AdminDispute>(`/disputes/${id}/respond`, data)
  return res.data
}

export const getAdminTestimonials = async (): Promise<TestimonialResponse[]> => {
  const res = await apiClient.get<TestimonialResponse[]>('/testimonials/admin')
  return res.data
}

export const approveTestimonial = async (id: string): Promise<TestimonialResponse> => {
  const res = await apiClient.post<TestimonialResponse>(`/testimonials/${id}/approve`)
  return res.data
}
