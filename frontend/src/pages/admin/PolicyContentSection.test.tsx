import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PolicyContentSection from './PolicyContentSection'
import {
  listPageContent,
  createPageSection,
  updatePageSection,
  deletePageSection,
} from '../../api/pageContentApi'

vi.mock('../../api/pageContentApi', () => ({
  listPageContent: vi.fn(),
  createPageSection: vi.fn(),
  updatePageSection: vi.fn(),
  deletePageSection: vi.fn(),
  reorderPageSections: vi.fn(),
}))

const mockList = vi.mocked(listPageContent)
const mockCreate = vi.mocked(createPageSection)
const mockUpdate = vi.mocked(updatePageSection)
const mockDelete = vi.mocked(deletePageSection)

Object.defineProperty(window, 'confirm', { writable: true, value: vi.fn(() => true) })

function renderSection(page: 'privacy' | 'terms' = 'privacy') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PolicyContentSection page={page} />
    </QueryClientProvider>,
  )
}

const sections = [
  { id: 's1', title: 'Info We Collect', body: 'Line one\nLine two', sort_order: 0, is_active: true },
  { id: 's2', title: 'Security', body: 'Single line', sort_order: 1, is_active: false },
]

const baseContent = {
  slug: 'privacy',
  header: { kicker: '', title: '', subtitle: '', last_updated_label: '' },
  contact: { title: '', text: '', email: '' },
  sections,
}

describe('PolicyContentSection', () => {
  beforeEach(() => {
    mockList.mockReset()
    mockCreate.mockReset()
    mockUpdate.mockReset()
    mockDelete.mockReset()
    mockList.mockResolvedValue(baseContent)
    mockCreate.mockResolvedValue({ id: 's3', title: 'New', body: 'Body', sort_order: 2, is_active: true })
    mockUpdate.mockResolvedValue(sections[0])
    mockDelete.mockResolvedValue()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('lists the sections with the correct page', async () => {
    renderSection('terms')
    expect(mockList).toHaveBeenCalledWith('terms')
    await waitFor(() => {
      expect(screen.getByText('Info We Collect')).toBeInTheDocument()
      expect(screen.getByText('Security')).toBeInTheDocument()
    })
  })

  it('shows each bullet of a section in the list', async () => {
    renderSection()
    await waitFor(() => {
      expect(screen.getByText('Line one')).toBeInTheDocument()
      expect(screen.getByText('Line two')).toBeInTheDocument()
    })
  })

  it('marks inactive sections as hidden', async () => {
    renderSection()
    await waitFor(() => {
      expect(screen.getByText('Hidden')).toBeInTheDocument()
    })
  })

  it('adds a new section via the modal', async () => {
    const user = userEvent.setup()
    renderSection()
    // Header button opens the modal
    await user.click(screen.getByRole('button', { name: 'Add section' }))

    // Modal appears with per-bullet inputs
    expect(screen.getByRole('heading', { name: 'Add Section' })).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText(/Information We Collect/i), 'New Section')
    await user.type(screen.getByPlaceholderText('Bullet 1'), 'First')
    // Add a second bullet
    await user.click(screen.getByRole('button', { name: 'Add bullet' }))
    await user.type(screen.getAllByPlaceholderText(/^Bullet \d$/)[1], 'Second')

    // Submit inside the modal
    const submitButtons = screen.getAllByRole('button', { name: 'Add section' })
    await user.click(submitButtons[submitButtons.length - 1])

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ page: 'privacy', title: 'New Section', body: 'First\nSecond' }),
      )
    })
  })

  it('deletes a section after confirmation', async () => {
    const user = userEvent.setup()
    renderSection()
    await waitFor(() => expect(screen.getByText('Info We Collect')).toBeInTheDocument())
    const card = screen.getByText('Info We Collect').closest('div')!.parentElement!.parentElement!
    const deleteBtn = within(card).getByRole('button', { name: 'Delete section' })
    await user.click(deleteBtn)
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('privacy', 's1')
    })
  })

  it('edits bullets individually (per-bullet inputs joined by newline on save)', async () => {
    const user = userEvent.setup()
    mockUpdate.mockResolvedValue({ ...sections[0], title: 'Info We Collect', body: 'Line one edited\nLine two' })
    renderSection()
    await waitFor(() => expect(screen.getByText('Info We Collect')).toBeInTheDocument())

    const card = screen.getByText('Info We Collect').closest('div')!.parentElement!.parentElement!
    await user.click(within(card).getByRole('button', { name: 'Edit' }))

    const firstBullet = screen.getByDisplayValue('Line one')
    await user.clear(firstBullet)
    await user.type(firstBullet, 'Line one edited')

    // Add a third bullet then save
    await user.click(screen.getByRole('button', { name: 'Add bullet' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        'privacy',
        's1',
        expect.objectContaining({ body: 'Line one edited\nLine two\n' }),
      )
    })
  })
})
