import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from './apiClient'
import {
  getFeedbackTypes,
  getPublicFeedback,
  getListingFeedback,
  getUserFeedback,
  checkFeedbackEligibility,
  submitFeedback,
  getMySubmittedFeedback,
  getAllFeedbackTypes,
  createFeedbackType,
  updateFeedbackType,
  deleteFeedbackType,
} from './feedbackApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)
const patch = vi.mocked(apiClient.patch)
const del = vi.mocked(apiClient.delete)

describe('feedbackApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    patch.mockReset()
    del.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
    patch.mockResolvedValue({ data: {} })
    del.mockResolvedValue({ data: undefined })
  })

  it('getFeedbackTypes reads the public types list', async () => {
    await getFeedbackTypes()
    expect(get).toHaveBeenCalledWith('/feedback/types')
  })

  it('getPublicFeedback defaults the limit to 10', async () => {
    await getPublicFeedback()
    expect(get).toHaveBeenCalledWith('/feedback/public', { params: { limit: 10 } })
  })

  it('getPublicFeedback forwards an explicit limit', async () => {
    await getPublicFeedback(3)
    expect(get).toHaveBeenCalledWith('/feedback/public', { params: { limit: 3 } })
  })

  it('getListingFeedback reads by listing id', async () => {
    await getListingFeedback('l-1')
    expect(get).toHaveBeenCalledWith('/feedback/listing/l-1')
  })

  it('getUserFeedback reads by user id', async () => {
    await getUserFeedback('u-1')
    expect(get).toHaveBeenCalledWith('/feedback/user/u-1')
  })

  it('checkFeedbackEligibility reads by listing id under /me', async () => {
    await checkFeedbackEligibility('l-1')
    expect(get).toHaveBeenCalledWith('/feedback/me/eligibility/l-1')
  })

  it('submitFeedback posts the feedback payload', async () => {
    const data = { listing_id: 'l-1', reviewee_id: 'u-2', feedback_type_id: 'ft-1', rating: 5 }
    await submitFeedback(data)
    expect(post).toHaveBeenCalledWith('/feedback/', data)
  })

  it('getMySubmittedFeedback reads the current user\'s submissions', async () => {
    await getMySubmittedFeedback()
    expect(get).toHaveBeenCalledWith('/feedback/me/submitted')
  })

  it('getAllFeedbackTypes reads the admin (including inactive) types list', async () => {
    await getAllFeedbackTypes()
    expect(get).toHaveBeenCalledWith('/feedback/types/all')
  })

  it('createFeedbackType posts name/reviewer_role', async () => {
    await createFeedbackType({ name: 'Punctual', reviewer_role: 'buyer' })
    expect(post).toHaveBeenCalledWith('/feedback/types', { name: 'Punctual', reviewer_role: 'buyer' })
  })

  it('updateFeedbackType PATCHes by id', async () => {
    await updateFeedbackType('ft-1', { is_active: false })
    expect(patch).toHaveBeenCalledWith('/feedback/types/ft-1', { is_active: false })
  })

  it('deleteFeedbackType deletes by id', async () => {
    await deleteFeedbackType('ft-1')
    expect(del).toHaveBeenCalledWith('/feedback/types/ft-1')
  })
})
