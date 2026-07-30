import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recsClient } from './apiClient'
import { getTrending } from './recommendationsApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  recsClient: { get: vi.fn() },
  biddingClient: { get: vi.fn() },
}))

const recsGet = vi.mocked(recsClient.get)

describe('recommendationsApi', () => {
  beforeEach(() => {
    recsGet.mockReset()
    recsGet.mockResolvedValue({ data: { items: [], count: 0, type: 'trending' } })
  })

  it('getTrending calls the recommendation-engine client, not the main apiClient', async () => {
    await getTrending({ user_id: 'u-1', limit: 5 })
    expect(recsGet).toHaveBeenCalledWith('/recs/trending', { params: { user_id: 'u-1', limit: 5 } })
  })

  it('getTrending works with no params', async () => {
    await getTrending()
    expect(recsGet).toHaveBeenCalledWith('/recs/trending', { params: undefined })
  })
})
