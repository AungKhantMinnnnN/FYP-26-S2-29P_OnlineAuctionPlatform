import apiClient from './apiClient'

export interface BoardSummary {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  item_count: number
  created_at: string
  updated_at: string
}

export interface BoardListingSnapshot {
  id: string
  title: string
  image_url: string | null
  final_price: number
  ended_at: string
}

export interface BoardItem {
  id: string
  board_id: string
  auction_result_id: string
  note: string | null
  sort_order: number
  added_at: string
  // null when the underlying auction result/listing has since been removed -- see
  // board_service.py's _listing_snapshot(), which returns None for an orphaned item.
  listing: BoardListingSnapshot | null
}

export interface BoardDetail {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  items: BoardItem[]
}

export const getMyBoards = async (): Promise<BoardSummary[]> => {
  const res = await apiClient.get<BoardSummary[]>('/boards/me')
  return res.data
}

export const getBoard = async (id: string): Promise<BoardDetail> => {
  const res = await apiClient.get<BoardDetail>(`/boards/${id}`)
  return res.data
}

export const createBoard = async (data: {
  name: string
  description?: string | null
  is_public: boolean
}): Promise<BoardSummary> => {
  const res = await apiClient.post<BoardSummary>('/boards/', data)
  return res.data
}

export const updateBoard = async (
  id: string,
  data: { name?: string; description?: string | null; is_public?: boolean },
): Promise<BoardSummary> => {
  const res = await apiClient.post<BoardSummary>(`/boards/${id}`, data)
  return res.data
}

export const deleteBoard = async (id: string): Promise<void> => {
  await apiClient.delete(`/boards/${id}`)
}

export const addBoardItem = async (
  boardId: string,
  auctionResultId: string,
): Promise<BoardItem> => {
  const res = await apiClient.post<BoardItem>(`/boards/${boardId}/items`, {
    auction_result_id: auctionResultId,
  })
  return res.data
}

export const removeBoardItem = async (
  boardId: string,
  itemId: string,
): Promise<void> => {
  await apiClient.delete(`/boards/${boardId}/items/${itemId}`)
}
