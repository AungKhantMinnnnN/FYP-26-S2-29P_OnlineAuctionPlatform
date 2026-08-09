import apiClient from './apiClient'

export type PageKey = 'privacy' | 'terms'

export type PageSection = {
  id: string
  title: string
  body: string
  sort_order: number
  is_active: boolean
}

export type PageContentResponse = {
  slug: string
  sections: PageSection[]
}

export type PageSectionCreateInput = {
  page: PageKey
  title: string
  body: string
  is_active?: boolean
}

export type PageSectionUpdateInput = {
  title?: string
  body?: string
  is_active?: boolean
}

// ── Public ──────────────────────────────────────────────────────────────────────
// Returns only the active sections, in display order.
export const getPageContent = async (page: PageKey): Promise<PageSection[]> => {
  const res = await apiClient.get<PageContentResponse>(`/page-content/${page}`)
  return res.data.sections
}

// ── Admin ───────────────────────────────────────────────────────────────────────
// Returns all sections (active + inactive) for editing.
export const listPageSections = async (page: PageKey): Promise<PageSection[]> => {
  const res = await apiClient.get<PageContentResponse>('/admin/page-content', {
    params: { page },
  })
  return res.data.sections
}

export const createPageSection = async (input: PageSectionCreateInput): Promise<PageSection> => {
  const res = await apiClient.post<PageSection>('/admin/page-content', input)
  return res.data
}

export const updatePageSection = async (
  page: PageKey,
  sectionId: string,
  input: PageSectionUpdateInput,
): Promise<PageSection> => {
  const res = await apiClient.post<PageSection>(`/admin/page-content/${page}/${sectionId}`, input)
  return res.data
}

export const deletePageSection = async (page: PageKey, sectionId: string): Promise<void> => {
  await apiClient.delete(`/admin/page-content/${page}/${sectionId}`)
}

export const reorderPageSections = async (page: PageKey, orderedIds: string[]): Promise<void> => {
  await apiClient.post(`/admin/page-content/${page}/order`, { ordered_ids: orderedIds })
}
