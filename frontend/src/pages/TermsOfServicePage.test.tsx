import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TermsOfServicePage from './TermsOfServicePage'
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
      <TermsOfServicePage />
    </QueryClientProvider>,
  )
}

const baseContent = {
  slug: 'terms',
  header: { kicker: 'How auctionhub works', title: 'How AuctionHub Works', subtitle: 'The rules of the platform.', last_updated_label: 'Last updated' },
  contact: { title: 'Contact us', text: 'Questions? Email us.', email: 'support@auctionhub.sg' },
  sections: [],
}

const sections = [
  { id: '1', title: 'Acceptance of Terms', body: 'Agree to terms\nSecond line', sort_order: 1, is_active: true },
  { id: '2', title: 'Termination', body: 'We may suspend your account', sort_order: 2, is_active: true },
]

describe('TermsOfServicePage', () => {
  beforeEach(() => {
    mockGetPageContent.mockReset()
  })

  it('renders the header from the database', async () => {
    mockGetPageContent.mockResolvedValue(baseContent)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('How auctionhub works')).toBeInTheDocument()
      expect(screen.getByText('How AuctionHub Works')).toBeInTheDocument()
    })
  })

  it('fetches and renders DB sections with newline-as-bullet splitting', async () => {
    mockGetPageContent.mockResolvedValue({ ...baseContent, sections })
    renderPage()
    expect(mockGetPageContent).toHaveBeenCalledWith('terms')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Acceptance of Terms' })).toBeInTheDocument()
    })
    expect(screen.getByText('Agree to terms')).toBeInTheDocument()
    expect(screen.getByText('Second line')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Termination' })).toBeInTheDocument()
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
        screen.getByText("Couldn't load the Terms of Service. Please try again later."),
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
