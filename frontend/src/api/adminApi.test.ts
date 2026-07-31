import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient, { biddingClient, recsClient } from './apiClient'
import {
  checkServicesHealth,
  getPlatformStats,
  getSystemLogs,
  getAuditLogs,
  getOptions,
  getProhibitedKeywords,
  createProhibitedKeyword,
  deleteProhibitedKeyword,
  getFlaggedAttempts,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminDisputes,
  respondToDispute,
  getAdminTestimonials,
  approveTestimonial,
  deleteTestimonial,
} from './adminApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  biddingClient: { get: vi.fn() },
  recsClient: { get: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)
const patch = vi.mocked(apiClient.patch)
const del = vi.mocked(apiClient.delete)
const biddingGet = vi.mocked(biddingClient.get)
const recsGet = vi.mocked(recsClient.get)

describe('adminApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    patch.mockReset()
    del.mockReset()
    biddingGet.mockReset()
    recsGet.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
    patch.mockResolvedValue({ data: {} })
    del.mockResolvedValue({ data: {} })
  })

  describe('checkServicesHealth', () => {
    it('reports every service up when all three health checks succeed', async () => {
      get.mockResolvedValue({ data: { status: 'ok' } })
      biddingGet.mockResolvedValue({ data: { status: 'ok' } })
      recsGet.mockResolvedValue({ data: { status: 'ok' } })

      const result = await checkServicesHealth()

      expect(result).toHaveLength(3)
      expect(result.every((r) => r.status === 'up')).toBe(true)
      expect(get).toHaveBeenCalledWith('/health', { timeout: 5000 })
      expect(biddingGet).toHaveBeenCalledWith('/bids/health', { timeout: 5000 })
      expect(recsGet).toHaveBeenCalledWith('/recs/health', { timeout: 5000 })
    })

    it('reports a service down without failing the others when one rejects', async () => {
      get.mockResolvedValue({ data: { status: 'ok' } })
      biddingGet.mockRejectedValue({ response: { status: 503 } })
      recsGet.mockResolvedValue({ data: { status: 'ok' } })

      const result = await checkServicesHealth()

      const gateway = result.find((r) => r.name === 'API Gateway')
      const bidding = result.find((r) => r.name === 'Bidding Engine')
      const recs = result.find((r) => r.name === 'Recommendation Engine')
      expect(gateway?.status).toBe('up')
      expect(bidding?.status).toBe('down')
      expect(bidding?.detail).toBe('HTTP 503')
      expect(recs?.status).toBe('up')
    })

    it('reports "Unreachable" for a rejection with no HTTP response', async () => {
      get.mockRejectedValue(new Error('network down'))
      biddingGet.mockResolvedValue({ data: {} })
      recsGet.mockResolvedValue({ data: {} })

      const result = await checkServicesHealth()

      expect(result.find((r) => r.name === 'API Gateway')).toMatchObject({
        status: 'down',
        detail: 'Unreachable',
      })
    })
  })

  it('getPlatformStats reads /admin/stats', async () => {
    await getPlatformStats()
    expect(get).toHaveBeenCalledWith('/admin/stats')
  })

  it('getSystemLogs forwards filter params', async () => {
    await getSystemLogs({ page: 1, level: 'error' })
    expect(get).toHaveBeenCalledWith('/admin/system-logs', { params: { page: 1, level: 'error' } })
  })

  it('getAuditLogs forwards filter params', async () => {
    await getAuditLogs({ admin_id: 'a1' })
    expect(get).toHaveBeenCalledWith('/admin/logs', { params: { admin_id: 'a1' } })
  })

  it('getOptions reads the option set by key', async () => {
    await getOptions('condition')
    expect(get).toHaveBeenCalledWith('/admin/options/condition')
  })

  it('getProhibitedKeywords reads the keywords list', async () => {
    await getProhibitedKeywords()
    expect(get).toHaveBeenCalledWith('/admin/prohibited-keywords')
  })

  it('createProhibitedKeyword defaults the category to illegal_item', async () => {
    await createProhibitedKeyword('badword')
    expect(post).toHaveBeenCalledWith('/admin/prohibited-keywords', { keyword: 'badword', category: 'illegal_item' })
  })

  it('createProhibitedKeyword forwards an explicit category', async () => {
    await createProhibitedKeyword('badword', 'profanity')
    expect(post).toHaveBeenCalledWith('/admin/prohibited-keywords', { keyword: 'badword', category: 'profanity' })
  })

  it('deleteProhibitedKeyword deletes by id', async () => {
    await deleteProhibitedKeyword('kw-1')
    expect(del).toHaveBeenCalledWith('/admin/prohibited-keywords/kw-1')
  })

  it('getFlaggedAttempts forwards pagination params', async () => {
    await getFlaggedAttempts({ page: 2 })
    expect(get).toHaveBeenCalledWith('/admin/flagged-attempts', { params: { page: 2 } })
  })

  it('getAdminCategories reads the categories list', async () => {
    await getAdminCategories()
    expect(get).toHaveBeenCalledWith('/admin/categories')
  })

  it('createAdminCategory posts name/slug', async () => {
    await createAdminCategory({ name: 'Watches', slug: 'watches' })
    expect(post).toHaveBeenCalledWith('/admin/categories', { name: 'Watches', slug: 'watches' })
  })

  it('updateAdminCategory PATCHes by id', async () => {
    await updateAdminCategory('cat-1', { name: 'New name' })
    expect(patch).toHaveBeenCalledWith('/admin/categories/cat-1', { name: 'New name' })
  })

  it('deleteAdminCategory deletes by id', async () => {
    await deleteAdminCategory('cat-1')
    expect(del).toHaveBeenCalledWith('/admin/categories/cat-1')
  })

  it('getAdminDisputes omits params when no status filter is given', async () => {
    await getAdminDisputes()
    expect(get).toHaveBeenCalledWith('/disputes/', { params: undefined })
  })

  it('getAdminDisputes forwards the status filter when given', async () => {
    await getAdminDisputes('open')
    expect(get).toHaveBeenCalledWith('/disputes/', { params: { status: 'open' } })
  })

  it('respondToDispute posts the resolution', async () => {
    await respondToDispute('d-1', { status: 'resolved', resolution_note: 'refunded' })
    expect(post).toHaveBeenCalledWith('/disputes/d-1/respond', { status: 'resolved', resolution_note: 'refunded' })
  })

  it('getAdminTestimonials reads the admin testimonials list', async () => {
    await getAdminTestimonials()
    expect(get).toHaveBeenCalledWith('/testimonials/admin')
  })

  it('approveTestimonial posts to the approve endpoint with no body', async () => {
    await approveTestimonial('t-1')
    expect(post).toHaveBeenCalledWith('/testimonials/t-1/approve')
  })

  it('deleteTestimonial deletes by id', async () => {
    await deleteTestimonial('t-1')
    expect(del).toHaveBeenCalledWith('/testimonials/t-1')
  })
})
