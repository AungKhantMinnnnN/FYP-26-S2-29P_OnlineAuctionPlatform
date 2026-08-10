import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PrivacyPolicyPage from './PrivacyPolicyPage'
import { getPageContent } from '../api/pageContentApi'

vi.mock('../api/pageContentApi', () => ({ getPageContent: vi.fn() }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

const mockGetPageContent = vi.mocked(getPageContent)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PrivacyPolicyPage />
    </QueryClientProvider>,
  )
}

const baseContent = {
  slug: 'privacy',
  header: { kicker: 'Your privacy', title: 'Your Privacy Matters', subtitle: 'We protect your data.', last_updated_label: 'Last updated' },
  contact: { title: 'Contact us', text: 'Questions? Email us.', email: 'support@auctionhub.sg' },
  sections: [],
}

const sections = [
  { id: '1', title: 'Information We Collect', body: 'Line one\nLine two', sort_order: 1, is_active: true },
  { id: '2', title: 'Security', body: 'Single line', sort_order: 2, is_active: true },
]

describe('PrivacyPolicyPage', () => {
  beforeEach(() => {
    mockGetPageContent.mockReset()
  })

  it('renders the header from the database', async () => {
    mockGetPageContent.mockResolvedValue(baseContent)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Your privacy')).toBeInTheDocument()
      expect(screen.getByText('Your Privacy Matters')).toBeInTheDocument()
    })
  })

  it('fetches and renders DB sections with newline-as-bullet splitting', async () => {
    mockGetPageContent.mockResolvedValue({ ...baseContent, sections })
    renderPage()
    expect(mockGetPageContent).toHaveBeenCalledWith('privacy')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Information We Collect' })).toBeInTheDocument()
    })
    // Each newline becomes a bullet list item
    expect(screen.getByText('Line one')).toBeInTheDocument()
    expect(screen.getByText('Line two')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByText('Single line')).toBeInTheDocument()
  })

  it('shows an empty state when there are no sections', async () => {
    mockGetPageContent.mockResolvedValue({ ...baseContent, sections: [] })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No sections have been added yet.')).toBeInTheDocument()
    })
  })

  it('shows an error message when the request fails', async () => {
    mockGetPageContent.mockRejectedValue(new Error('boom'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText("Couldn't load the Privacy Policy. Please try again later."),
      ).toBeInTheDocument()
    })
  })

  it('renders the contact block', async () => {
    mockGetPageContent.mockResolvedValue(baseContent)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('support@auctionhub.sg')).toBeInTheDocument()
    })
  })
})
