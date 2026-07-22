import apiClient from './apiClient'
import type { Data } from '@puckeditor/core'

export type SiteContentResponse = {
  slug: string
  content: Data
  updated_at: string | null
}

export type VersionSummary = {
  id: string
  note: string | null
  created_by: string | null
  created_at: string
}

export type VersionDetail = {
  id: string
  content: Data
  created_at: string
}

export const getPublished = async (slug: string): Promise<SiteContentResponse> => {
  const res = await apiClient.get<SiteContentResponse>(`/cms/${slug}`)
  return res.data
}

export const getDraft = async (slug: string): Promise<SiteContentResponse> => {
  const res = await apiClient.get<SiteContentResponse>(`/cms/${slug}/draft`)
  return res.data
}

export const saveDraft = async (slug: string, content: Data): Promise<SiteContentResponse> => {
  const res = await apiClient.put<SiteContentResponse>(`/cms/${slug}/draft`, { content })
  return res.data
}

export const publish = async (slug: string, content: Data): Promise<SiteContentResponse> => {
  const res = await apiClient.post<SiteContentResponse>(`/cms/${slug}/publish`, { content })
  return res.data
}

export const listVersions = async (slug: string): Promise<VersionSummary[]> => {
  const res = await apiClient.get<VersionSummary[]>(`/cms/${slug}/versions`)
  return res.data
}

export const getVersion = async (versionId: string): Promise<VersionDetail> => {
  const res = await apiClient.get<VersionDetail>(`/cms/versions/${versionId}`)
  return res.data
}

export const rollback = async (slug: string, versionId: string): Promise<SiteContentResponse> => {
  const res = await apiClient.post<SiteContentResponse>(`/cms/${slug}/rollback/${versionId}`)
  return res.data
}
