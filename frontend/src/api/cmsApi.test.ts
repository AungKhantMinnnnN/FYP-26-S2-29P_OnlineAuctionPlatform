import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Data } from '@puckeditor/core'
import apiClient from './apiClient'
import { getPublished, getDraft, saveDraft, publish, listVersions, getVersion, rollback } from './cmsApi'

const emptyContent: Data = { root: {}, content: [] }

vi.mock('./apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)
const put = vi.mocked(apiClient.put)

describe('cmsApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    put.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
    put.mockResolvedValue({ data: {} })
  })

  it('getPublished reads the published content by slug', async () => {
    await getPublished('landing')
    expect(get).toHaveBeenCalledWith('/cms/landing')
  })

  it('getDraft reads the draft content by slug', async () => {
    await getDraft('landing')
    expect(get).toHaveBeenCalledWith('/cms/landing/draft')
  })

  it('saveDraft PUTs the content under the draft path', async () => {
    await saveDraft('landing', emptyContent)
    expect(put).toHaveBeenCalledWith('/cms/landing/draft', { content: emptyContent })
  })

  it('publish POSTs the content under the publish path', async () => {
    await publish('landing', emptyContent)
    expect(post).toHaveBeenCalledWith('/cms/landing/publish', { content: emptyContent })
  })

  it('listVersions reads the version history for a slug', async () => {
    await listVersions('landing')
    expect(get).toHaveBeenCalledWith('/cms/landing/versions')
  })

  it('getVersion reads a specific version by id (not scoped by slug)', async () => {
    await getVersion('v-1')
    expect(get).toHaveBeenCalledWith('/cms/versions/v-1')
  })

  it('rollback posts to the slug + version rollback path', async () => {
    await rollback('landing', 'v-1')
    expect(post).toHaveBeenCalledWith('/cms/landing/rollback/v-1')
  })
})
