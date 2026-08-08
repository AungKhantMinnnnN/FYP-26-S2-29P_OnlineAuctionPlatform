import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from './apiClient'
import { getMyInterests, updateMyInterests } from './interestsApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)

describe('interestsApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
  })

  it('getMyInterests reads the current user\'s interests', async () => {
    await getMyInterests()
    expect(get).toHaveBeenCalledWith('/users/me/interests')
  })

  it('updateMyInterests POSTs with camelCase param renamed to category_ids', async () => {
    await updateMyInterests(['cat-1', 'cat-2'])
    expect(post).toHaveBeenCalledWith('/users/me/interests', { category_ids: ['cat-1', 'cat-2'] })
  })
})
