import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from './apiClient'
import {
  getIssueTypes,
  createSupportTicket,
  getMyDisputes,
  createTestimonial,
  getMyTestimonials,
  getPublicTestimonials,
} from './supportApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)

describe('supportApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
  })

  it('getIssueTypes reads the issue types list', async () => {
    await getIssueTypes()
    expect(get).toHaveBeenCalledWith('/issue-types/')
  })

  it('createSupportTicket posts to /disputes/ (tickets are disputes under the hood)', async () => {
    const data = { listing_id: null, issue_type_id: 'it-1', subject: 'Help', category: 'other', description: 'x' }
    await createSupportTicket(data)
    expect(post).toHaveBeenCalledWith('/disputes/', data)
  })

  it('getMyDisputes reads the current user\'s disputes', async () => {
    await getMyDisputes()
    expect(get).toHaveBeenCalledWith('/disputes/me')
  })

  it('createTestimonial posts content/rating', async () => {
    await createTestimonial({ content: 'Great platform', rating: 5 })
    expect(post).toHaveBeenCalledWith('/testimonials/', { content: 'Great platform', rating: 5 })
  })

  it('getMyTestimonials reads the current user\'s testimonials', async () => {
    await getMyTestimonials()
    expect(get).toHaveBeenCalledWith('/testimonials/me')
  })

  it('getPublicTestimonials reads the public testimonials list', async () => {
    await getPublicTestimonials()
    expect(get).toHaveBeenCalledWith('/testimonials/')
  })
})
