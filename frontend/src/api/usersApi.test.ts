import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from './apiClient'
import {
  getSubscriptionTiers,
  manageSubscription,
  updateProfile,
  getMyBids,
  getMyPurchases,
  getMyWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getMyWallet,
  topUpWallet,
  getMyInterests,
  updateMyInterests,
  getMyStats,
  getMyQuota,
} from './usersApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)
const del = vi.mocked(apiClient.delete)

describe('usersApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    del.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
    del.mockResolvedValue({ data: undefined })
  })

  it('getSubscriptionTiers reads the public tiers endpoint', async () => {
    await getSubscriptionTiers()
    expect(get).toHaveBeenCalledWith('/subscription-tiers')
  })

  it('manageSubscription posts the action', async () => {
    await manageSubscription('renew')
    expect(post).toHaveBeenCalledWith('/users/me/subscription', { action: 'renew' })
  })

  it('getMyQuota reads the /users/me/quota endpoint', async () => {
    await getMyQuota()
    expect(get).toHaveBeenCalledWith('/users/me/quota')
  })

  it('updateProfile posts the full payload as-is', async () => {
    const payload = { full_name: 'Bob', city: 'SG' }
    await updateProfile(payload)
    expect(post).toHaveBeenCalledWith('/users/me/profile', payload)
  })

  it('getMyBids forwards pagination/result params', async () => {
    await getMyBids({ page: 2, size: 10, result: 'won' })
    expect(get).toHaveBeenCalledWith('/users/me/bids', { params: { page: 2, size: 10, result: 'won' } })
  })

  it('getMyPurchases forwards pagination params', async () => {
    await getMyPurchases({ page: 1, size: 20 })
    expect(get).toHaveBeenCalledWith('/users/me/purchases', { params: { page: 1, size: 20 } })
  })

  it('getMyWatchlist reads with no params', async () => {
    await getMyWatchlist()
    expect(get).toHaveBeenCalledWith('/users/me/watchlist')
  })

  it('addToWatchlist posts the listing_id', async () => {
    await addToWatchlist('listing-1')
    expect(post).toHaveBeenCalledWith('/users/me/watchlist', { listing_id: 'listing-1' })
  })

  it('removeFromWatchlist deletes by listing id in the URL', async () => {
    await removeFromWatchlist('listing-1')
    expect(del).toHaveBeenCalledWith('/users/me/watchlist/listing-1')
  })

  it('getMyWallet forwards pagination params', async () => {
    await getMyWallet({ page: 3, size: 5 })
    expect(get).toHaveBeenCalledWith('/users/me/wallet', { params: { page: 3, size: 5 } })
  })

  it('topUpWallet posts the amount', async () => {
    await topUpWallet(50)
    expect(post).toHaveBeenCalledWith('/users/me/wallet/topup', { amount: 50 })
  })

  it('getMyInterests reads with no params', async () => {
    await getMyInterests()
    expect(get).toHaveBeenCalledWith('/users/me/interests')
  })

  it('updateMyInterests posts category_ids', async () => {
    await updateMyInterests(['cat-1', 'cat-2'])
    expect(post).toHaveBeenCalledWith('/users/me/interests', { category_ids: ['cat-1', 'cat-2'] })
  })

  it('getMyStats reads the seller stats endpoint', async () => {
    await getMyStats()
    expect(get).toHaveBeenCalledWith('/users/me/stats')
  })
})
