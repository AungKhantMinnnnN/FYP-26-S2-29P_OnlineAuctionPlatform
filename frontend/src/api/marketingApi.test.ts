import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from './apiClient'
import {
  getMarketingVideoUrl,
  uploadMarketingVideo,
  listMarketingVideos,
  activateMarketingVideo,
  deleteMarketingVideo,
} from './marketingApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)
const del = vi.mocked(apiClient.delete)

describe('marketingApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    del.mockReset()
  })

  describe('getMarketingVideoUrl', () => {
    it('returns the url when the request succeeds', async () => {
      get.mockResolvedValue({ data: { url: 'https://cdn/video.mp4' } })
      const result = await getMarketingVideoUrl()
      expect(get).toHaveBeenCalledWith('/marketing-video')
      expect(result).toBe('https://cdn/video.mp4')
    })

    it('returns null (not an error) when no video is active (404)', async () => {
      get.mockRejectedValue({ response: { status: 404 } })
      const result = await getMarketingVideoUrl()
      expect(result).toBeNull()
    })

    it('rethrows for a non-404 failure', async () => {
      const error = { response: { status: 500 } }
      get.mockRejectedValue(error)
      await expect(getMarketingVideoUrl()).rejects.toBe(error)
    })

    it('rethrows for a network error with no response at all', async () => {
      const error = new Error('network down')
      get.mockRejectedValue(error)
      await expect(getMarketingVideoUrl()).rejects.toBe(error)
    })
  })

  it('uploadMarketingVideo sends the file as multipart form data', async () => {
    post.mockResolvedValue({ data: undefined })
    const file = new File(['x'], 'hero.mp4', { type: 'video/mp4' })
    await uploadMarketingVideo(file)
    const [url, body, config] = post.mock.calls[0]
    expect(url).toBe('/marketing-video')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } })
  })

  it('listMarketingVideos unwraps the items array', async () => {
    const items = [{ id: 'v1', url: 'x', original_filename: null, is_active: true, created_at: 'now' }]
    get.mockResolvedValue({ data: { items } })
    const result = await listMarketingVideos()
    expect(get).toHaveBeenCalledWith('/marketing-videos')
    expect(result).toBe(items)
  })

  it('activateMarketingVideo posts to the activate endpoint with no body', async () => {
    post.mockResolvedValue({ data: undefined })
    await activateMarketingVideo('v1')
    expect(post).toHaveBeenCalledWith('/marketing-videos/v1/activate')
  })

  it('deleteMarketingVideo deletes by id', async () => {
    del.mockResolvedValue({ data: undefined })
    await deleteMarketingVideo('v1')
    expect(del).toHaveBeenCalledWith('/marketing-videos/v1')
  })
})
