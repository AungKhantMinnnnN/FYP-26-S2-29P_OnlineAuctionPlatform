import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '../api/apiClient'
import { adminUsersApi } from './adminUsersApi'

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const patch = vi.mocked(apiClient.patch)
const del = vi.mocked(apiClient.delete)

describe('adminUsersApi', () => {
  beforeEach(() => {
    get.mockReset()
    patch.mockReset()
    del.mockReset()
    get.mockResolvedValue({ data: {} })
    patch.mockResolvedValue({ data: {} })
    del.mockResolvedValue({ data: undefined })
  })

  it('getUsers uses the documented defaults when called with no arguments', async () => {
    await adminUsersApi.getUsers()
    expect(get).toHaveBeenCalledWith('/admin/users', {
      params: { search: undefined, page: 1, size: 10, status: undefined, role: undefined },
    })
  })

  it('getUsers turns an empty search string into undefined rather than sending ""', async () => {
    await adminUsersApi.getUsers('')
    expect(get).toHaveBeenCalledWith(
      '/admin/users',
      expect.objectContaining({ params: expect.objectContaining({ search: undefined }) })
    )
  })

  it('getUsers forwards a non-empty search string, page, size, status, and role', async () => {
    await adminUsersApi.getUsers('bob', 2, 25, 'active', 'admin')
    expect(get).toHaveBeenCalledWith('/admin/users', {
      params: { search: 'bob', page: 2, size: 25, status: 'active', role: 'admin' },
    })
  })

  it('getUserById reads a single user by id', async () => {
    await adminUsersApi.getUserById('u-1')
    expect(get).toHaveBeenCalledWith('/admin/users/u-1')
  })

  it('suspendUser PATCHes with the suspension reason', async () => {
    await adminUsersApi.suspendUser('u-1', { reason: 'fraud' })
    expect(patch).toHaveBeenCalledWith('/admin/users/u-1/suspend', { reason: 'fraud' })
  })

  it('unsuspendUser PATCHes with no body', async () => {
    await adminUsersApi.unsuspendUser('u-1')
    expect(patch).toHaveBeenCalledWith('/admin/users/u-1/unsuspend')
  })

  it('deleteUser deletes by id', async () => {
    await adminUsersApi.deleteUser('u-1')
    expect(del).toHaveBeenCalledWith('/admin/users/u-1')
  })
})
