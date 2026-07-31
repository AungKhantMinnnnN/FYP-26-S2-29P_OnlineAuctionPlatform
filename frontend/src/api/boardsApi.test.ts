import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from './apiClient'
import {
  getMyBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  addBoardItem,
  removeBoardItem,
} from './boardsApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)
const del = vi.mocked(apiClient.delete)

describe('boardsApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    del.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
    del.mockResolvedValue({ data: undefined })
  })

  it('getMyBoards reads the current user\'s boards', async () => {
    await getMyBoards()
    expect(get).toHaveBeenCalledWith('/boards/me')
  })

  it('getBoard reads a single board by id', async () => {
    await getBoard('b-1')
    expect(get).toHaveBeenCalledWith('/boards/b-1')
  })

  it('createBoard posts the board payload', async () => {
    const data = { name: 'Favorites', is_public: true }
    await createBoard(data)
    expect(post).toHaveBeenCalledWith('/boards/', data)
  })

  it('updateBoard POSTs (not PATCHes) the update by id', async () => {
    await updateBoard('b-1', { name: 'Renamed' })
    expect(post).toHaveBeenCalledWith('/boards/b-1', { name: 'Renamed' })
  })

  it('deleteBoard deletes by id', async () => {
    await deleteBoard('b-1')
    expect(del).toHaveBeenCalledWith('/boards/b-1')
  })

  it('addBoardItem posts the auction_result_id under the board', async () => {
    await addBoardItem('b-1', 'ar-1')
    expect(post).toHaveBeenCalledWith('/boards/b-1/items', { auction_result_id: 'ar-1' })
  })

  it('removeBoardItem deletes the item under the board', async () => {
    await removeBoardItem('b-1', 'item-1')
    expect(del).toHaveBeenCalledWith('/boards/b-1/items/item-1')
  })
})
