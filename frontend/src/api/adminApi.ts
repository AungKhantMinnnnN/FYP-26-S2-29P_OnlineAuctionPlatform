import apiClient from './apiClient'

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
// No backend endpoint yet — the section renders a graceful-empty shell.

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
