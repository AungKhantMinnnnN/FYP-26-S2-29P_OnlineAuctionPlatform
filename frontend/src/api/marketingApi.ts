import apiClient from './apiClient'

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
