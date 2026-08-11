import apiClient from './apiClient'

export type PageKey = 'privacy' | 'terms'

export type PageHeader = {
  kicker: string
  title: string
  subtitle: string
  last_updated_label: string
}

export type PageContact = {
  title: string
  text: string
  email: string
}

export type PageSection = {
  id: string
  title: string
  body: string
  sort_order: number
  is_active: boolean
}

export type PageContent = {
  slug: string
  header: PageHeader
  contact: PageContact
  sections: PageSection[]
}

export type PageHeaderUpdateInput = {
  kicker?: string
  title?: string
  subtitle?: string
  last_updated_label?: string
}

export type PageContactUpdateInput = {
  title?: string
  text?: string
  email?: string
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
// Returns the header, contact, and active sections (in display order).
export const getPageContent = async (page: PageKey): Promise<PageContent> => {
  const res = await apiClient.get<PageContent>(`/page-content/${page}`)
  return res.data
}

// ── Admin ───────────────────────────────────────────────────────────────────────
// Returns the header, contact, and all sections (active + inactive) for editing.
export const listPageContent = async (page: PageKey): Promise<PageContent> => {
  const res = await apiClient.get<PageContent>('/admin/page-content', {
    params: { page },
  })
  return res.data
}

export const updatePageHeader = async (
  page: PageKey,
  input: PageHeaderUpdateInput,
): Promise<PageContent> => {
  const res = await apiClient.post<PageContent>(`/admin/page-content/${page}/header`, input)
  return res.data
}

export const updatePageContact = async (
  page: PageKey,
  input: PageContactUpdateInput,
): Promise<PageContent> => {
  const res = await apiClient.post<PageContent>(`/admin/page-content/${page}/contact`, input)
  return res.data
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
