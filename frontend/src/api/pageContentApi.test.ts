import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from './apiClient'
import {
  getPageContent,
  listPageContent,
  createPageSection,
  updatePageSection,
  deletePageSection,
  reorderPageSections,
} from './pageContentApi'

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)
const del = vi.mocked(apiClient.delete)

describe('pageContentApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    del.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
    del.mockResolvedValue({ data: {} })
  })

  it('getPageContent returns the full page content of the public endpoint', async () => {
    get.mockResolvedValue({
      data: {
        slug: 'privacy',
        header: { kicker: 'K', title: 'T', subtitle: 'S', last_updated_label: '' },
        contact: { title: '', text: '', email: '' },
        sections: [{ id: '1', title: 'A', body: 'x', sort_order: 0, is_active: true }],
      },
    })
    const content = await getPageContent('privacy')
    expect(get).toHaveBeenCalledWith('/page-content/privacy')
    expect(content.sections).toHaveLength(1)
  })

  it('listPageContent reads admin endpoint with page query param', async () => {
    await listPageContent('terms')
    expect(get).toHaveBeenCalledWith('/admin/page-content', { params: { page: 'terms' } })
  })

  it('createPageSection posts the new section', async () => {
    await createPageSection({ page: 'privacy', title: 'T', body: 'B' })
    expect(post).toHaveBeenCalledWith('/admin/page-content', { page: 'privacy', title: 'T', body: 'B' })
  })

  it('updatePageSection posts to the page + section path', async () => {
    await updatePageSection('privacy', 's1', { title: 'New' })
    expect(post).toHaveBeenCalledWith('/admin/page-content/privacy/s1', { title: 'New' })
  })

  it('deletePageSection DELETEs the page + section path', async () => {
    await deletePageSection('terms', 's2')
    expect(del).toHaveBeenCalledWith('/admin/page-content/terms/s2')
  })

  it('reorderPageSections posts the ordered ids to the order path', async () => {
    await reorderPageSections('privacy', ['b', 'a'])
    expect(post).toHaveBeenCalledWith('/admin/page-content/privacy/order', { ordered_ids: ['b', 'a'] })
  })
})
