import apiClient from './apiClient'

// ── Platform Activity Stats ─────────────────────────────────────────────────────

export interface PlatformStats {
  total_users: number
  active_auctions: number
  total_listings: number
  total_bids: number
  completed_auctions: number
  total_bid_volume: number
}

// ── System Logs ─────────────────────────────────────────────────────────────────

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

// ── Audit Logs ──────────────────────────────────────────────────────────────────

export interface AdminInfo {
  id: string
  username: string
}

export interface AuditLogEntry {
  id: string
  admin_id: string
  action: string
  target_id: string | null
  details: string | null
  created_at: string
  admin: AdminInfo | null
}

export interface AuditLogsResponse {
  items: AuditLogEntry[]
  total: number
  page: number
  size: number
  pages: number
}

// ── API (admin-only; endpoints not yet implemented — callers handle errors) ──────

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const res = await apiClient.get<PlatformStats>('/admin/stats')
  return res.data
}

export const getSystemLogs = async (
  params?: { page?: number; size?: number; level?: string; service?: string }
): Promise<SystemLogsResponse> => {
  const res = await apiClient.get<SystemLogsResponse>('/admin/system-logs', { params })
  return res.data
}

export const getAuditLogs = async (
  params?: { page?: number; size?: number; action?: string }
): Promise<AuditLogsResponse> => {
  const res = await apiClient.get<AuditLogsResponse>('/admin/audit-logs', { params })
  return res.data
}
