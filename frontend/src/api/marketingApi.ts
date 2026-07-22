import apiClient from './apiClient'

export type MarketingVideoItem = {
  id: string
  url: string
  original_filename: string | null
  is_active: boolean
  created_at: string
}

export const getMarketingVideoUrl = async (): Promise<string | null> => {
  try {
    const res = await apiClient.get<{ url: string }>('/marketing-video')
    return res.data.url
  } catch (error: any) {
    if (error?.response?.status === 404) return null
    throw error
  }
}

export const uploadMarketingVideo = async (file: File): Promise<void> => {
  const formData = new FormData()
  formData.append('file', file)
  await apiClient.post('/marketing-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const listMarketingVideos = async (): Promise<MarketingVideoItem[]> => {
  const res = await apiClient.get<{ items: MarketingVideoItem[] }>('/marketing-videos')
  return res.data.items
}

export const activateMarketingVideo = async (id: string): Promise<void> => {
  await apiClient.post(`/marketing-videos/${id}/activate`)
}

export const deleteMarketingVideo = async (id: string): Promise<void> => {
  await apiClient.delete(`/marketing-videos/${id}`)
}
