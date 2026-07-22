import apiClient from './apiClient'
import type { Data } from '@puckeditor/core'

export type SiteContentResponse = {
  slug: string
  content: Data
  updated_at: string
}

export const getPublished = async (slug: string): Promise<SiteContentResponse> => {
  const res = await apiClient.get<SiteContentResponse>(`/cms/${slug}`)
  return res.data
}
