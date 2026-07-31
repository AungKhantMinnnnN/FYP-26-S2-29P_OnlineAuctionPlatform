import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from './apiClient'
import {
  getAuctions,
  getMyListings,
  createListing,
  getAuction,
  updateListing,
  uploadAuctionImages,
  getFormMetadata,
  getSellerStats,
} from './auctionsApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)
const patch = vi.mocked(apiClient.patch)

describe('auctionsApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    patch.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
    patch.mockResolvedValue({ data: {} })
  })

  it('getAuctions forwards filter/pagination params to the listings endpoint', async () => {
    const params = { page: 1, size: 12, status: 'active', search: 'watch' }
    await getAuctions(params)
    expect(get).toHaveBeenCalledWith('/auctions/', { params })
  })

  it('getMyListings reads the current seller\'s listings endpoint', async () => {
    await getMyListings({ page: 1, size: 10 })
    expect(get).toHaveBeenCalledWith('/auctions/get_user_listings', { params: { page: 1, size: 10 } })
  })

  it('createListing posts the listing payload', async () => {
    const data = { title: 'A watch', category_id: 'c1' }
    await createListing(data)
    expect(post).toHaveBeenCalledWith('/auctions/create_listing', data)
  })

  it('getAuction reads a single auction by id', async () => {
    await getAuction('auc-1')
    expect(get).toHaveBeenCalledWith('/auctions/get_auction/auc-1')
  })

  it('updateListing PATCHes the listing by id', async () => {
    const data = { title: 'Updated title' }
    await updateListing('auc-1', data)
    expect(patch).toHaveBeenCalledWith('/auctions/auc-1', data)
  })

  it('uploadAuctionImages sends files as multipart form data', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    await uploadAuctionImages('auc-1', [file])
    expect(post).toHaveBeenCalledTimes(1)
    const [url, body, config] = post.mock.calls[0]
    expect(url).toBe('/auctions/upload_auction_images/auc-1')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).getAll('files')).toEqual([file])
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } })
  })

  it('getFormMetadata reads the form metadata endpoint', async () => {
    await getFormMetadata()
    expect(get).toHaveBeenCalledWith('/auctions/form_metadata')
  })

  it('getSellerStats reads the same endpoint as usersApi.getMyStats', async () => {
    await getSellerStats()
    expect(get).toHaveBeenCalledWith('/users/me/stats')
  })
})
