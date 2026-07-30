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

  // The source comment above updateMyInterests says "PUT /users/me/interests",
  // but the implementation actually calls apiClient.post — this test locks in
  // the real (POST) behavior so it fails loudly if that ever silently changes,
  // and flags the comment itself as stale/misleading.
  it('updateMyInterests actually POSTs (despite the "PUT" comment) with camelCase param renamed to category_ids', async () => {
    await updateMyInterests(['cat-1', 'cat-2'])
    expect(post).toHaveBeenCalledWith('/users/me/interests', { category_ids: ['cat-1', 'cat-2'] })
  })
})
