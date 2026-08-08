import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CmsPage from './CmsPage'
import { getPublished } from '../api/cmsApi'

vi.mock('../api/cmsApi', () => ({ getPublished: vi.fn() }))

// Stub Puck's <Render> (it does real DOM work) so tests target only CmsPage's own branching.
vi.mock('@puckeditor/core', () => ({
  Render: ({ data }: { data: unknown }) => <div data-testid="puck-render">{JSON.stringify(data)}</div>,
}))

function renderPage(slug = 'landing') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CmsPage slug={slug} />
    </QueryClientProvider>
  )
}

describe('CmsPage', () => {
  beforeEach(() => {
    vi.mocked(getPublished).mockReset()
  })

  it('renders nothing while loading', () => {
    vi.mocked(getPublished).mockReturnValue(new Promise(() => {}))
    const { container } = renderPage()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the Puck content once the published page loads', async () => {
    vi.mocked(getPublished).mockResolvedValue({
      slug: 'landing',
      content: { root: {}, content: [] },
      updated_at: '2026-01-01',
    })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('puck-render')).toBeInTheDocument())
    expect(getPublished).toHaveBeenCalledWith('landing')
  })

  it('shows a friendly error message when the fetch fails', async () => {
    vi.mocked(getPublished).mockRejectedValue(new Error('network error'))
    renderPage()
    await waitFor(() =>
      expect(screen.getByText("Couldn't load this page right now. Please refresh or try again shortly.")).toBeInTheDocument()
    )
  })
})
