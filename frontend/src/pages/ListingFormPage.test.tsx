import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ListingFormPage from './ListingFormPage'
import { createListing, updateListing, getAuction, uploadAuctionImages, getFormMetadata } from '../api/auctionsApi'
import type { AuctionListing } from '../api/auctionsApi'

const minimalListing: AuctionListing = {
  id: 'new-listing',
  seller_id: 's1',
  title: 'A Watch',
  condition: 'used',
  bidding_type: 'price_up',
  status: 'active',
  start_time: '2026-01-01',
  end_time: '2026-01-08',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  images: [],
}

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../api/auctionsApi', () => ({
  createListing: vi.fn(),
  updateListing: vi.fn(),
  getAuction: vi.fn(),
  uploadAuctionImages: vi.fn(),
  getFormMetadata: vi.fn(),
}))

const metadata = {
  categories: [{ id: 'c1', name: 'Watches', slug: 'watches', is_active: true }],
  conditions: [{ id: 'new', name: 'New' }, { id: 'used', name: 'Used' }],
  biddingTypes: [{ id: 'price_up', name: 'price_up' }, { id: 'low_start', name: 'low_start' }],
  durations: [{ value: 1, label: '1 day' }, { value: 7, label: '7 days' }, { value: 14, label: '14 days' }],
}

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/create-listing']}>
      <Routes>
        <Route path="/create-listing" element={<ListingFormPage />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderEdit(id = 'listing-1') {
  return render(
    <MemoryRouter initialEntries={[`/listings/${id}/edit`]}>
      <Routes>
        <Route path="/listings/:id/edit" element={<ListingFormPage />} />
      </Routes>
    </MemoryRouter>
  )
}

// userEvent.upload() emulates a real OS file picker, which silently filters
// out files that don't match the input's `accept` attribute -- it can't be
// used to test the JS-level type-rejection branch (that codepath is only
// reachable via drag-and-drop, which doesn't respect `accept`). Bypass it by
// setting `.files` directly and firing the change event, same as a drop would.
function dropFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

async function fillMinimumValidFields() {
  await userEvent.type(screen.getByLabelText('Listing Title'), 'A Watch')
  await userEvent.selectOptions(screen.getByLabelText('Item Condition'), 'used')
  await userEvent.clear(screen.getByLabelText('Starting Price ($)'))
  await userEvent.type(screen.getByLabelText('Starting Price ($)'), '100')
}

describe('ListingFormPage', () => {
  beforeEach(() => {
    vi.mocked(getFormMetadata).mockResolvedValue(metadata)
    vi.mocked(getAuction).mockReset()
    vi.mocked(createListing).mockReset()
    vi.mocked(updateListing).mockReset()
    vi.mocked(uploadAuctionImages).mockReset()
    mockNavigate.mockReset()
    // jsdom does not implement object URLs.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('auto-selects the second duration option once metadata loads (defaults away from the shortest)', async () => {
    renderCreate()
    await waitFor(() => expect(screen.getByText('7 days')).toBeInTheDocument())
    // The 2nd duration (index 1) should be visually selected by default.
    expect(screen.getByText('7 days').closest('button')).toHaveClass('border-accent-500')
  })

  it('shows validation errors for missing title/condition/price and blocks submission', async () => {
    renderCreate()
    await waitFor(() => expect(getFormMetadata).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Publish Auction' }))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Condition is required')).toBeInTheDocument()
    expect(screen.getByText('Starting price must be greater than 0')).toBeInTheDocument()
    expect(createListing).not.toHaveBeenCalled()
  })

  it('rejects a reserve price below the starting price', async () => {
    renderCreate()
    await waitFor(() => expect(getFormMetadata).toHaveBeenCalled())
    await fillMinimumValidFields()
    await userEvent.type(screen.getByLabelText('Reserve Price ($)'), '50')
    await userEvent.click(screen.getByRole('button', { name: 'Publish Auction' }))
    expect(screen.getByText('Reserve price must be at least the starting price')).toBeInTheDocument()
    expect(createListing).not.toHaveBeenCalled()
  })

  it('creates a listing with status "active" from Publish Auction and navigates to /activity', async () => {
    vi.mocked(createListing).mockResolvedValue(minimalListing)
    renderCreate()
    await waitFor(() => expect(getFormMetadata).toHaveBeenCalled())
    await fillMinimumValidFields()
    await userEvent.click(screen.getByRole('button', { name: 'Publish Auction' }))

    await waitFor(() => expect(createListing).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(createListing).mock.calls[0][0] as Record<string, unknown>
    expect(payload).toMatchObject({ title: 'A Watch', condition: 'used', starting_price: 100, status: 'active' })
    expect(mockNavigate).toHaveBeenCalledWith('/activity')
  })

  it('creates a listing with status "draft" from Save as Draft', async () => {
    vi.mocked(createListing).mockResolvedValue(minimalListing)
    renderCreate()
    await waitFor(() => expect(getFormMetadata).toHaveBeenCalled())
    await fillMinimumValidFields()
    await userEvent.click(screen.getByRole('button', { name: 'Save as Draft' }))
    await waitFor(() => expect(createListing).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(createListing).mock.calls[0][0] as Record<string, unknown>
    expect(payload).toMatchObject({ status: 'draft' })
  })

  it('uploads selected images after a successful create', async () => {
    vi.mocked(createListing).mockResolvedValue(minimalListing)
    vi.mocked(uploadAuctionImages).mockResolvedValue([])
    renderCreate()
    await waitFor(() => expect(getFormMetadata).toHaveBeenCalled())
    await fillMinimumValidFields()

    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInput, file)

    await userEvent.click(screen.getByRole('button', { name: 'Publish Auction' }))
    await waitFor(() => expect(uploadAuctionImages).toHaveBeenCalledWith('new-listing', [file]))
  })

  it('rejects an unsupported image file type', async () => {
    renderCreate()
    await waitFor(() => expect(getFormMetadata).toHaveBeenCalled())
    const file = new File(['x'], 'photo.gif', { type: 'image/gif' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    dropFiles(fileInput, [file])
    expect(screen.getByText('Only PNG, JPG, and WEBP images are supported.')).toBeInTheDocument()
  })

  it('caps uploads at 4 total images', async () => {
    renderCreate()
    await waitFor(() => expect(getFormMetadata).toHaveBeenCalled())
    const files = [1, 2, 3, 4, 5].map((n) => new File(['x'], `p${n}.png`, { type: 'image/png' }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    dropFiles(fileInput, files)
    // "(4 / 4)" is split across sibling text/expression nodes in the JSX, so
    // match on the containing span's full text content instead of an exact string.
    expect(screen.getByText((_, node) => node?.tagName === 'SPAN' && node.textContent === '(4 / 4)')).toBeInTheDocument()
  })

  it('shows the backend error detail when creation fails', async () => {
    vi.mocked(createListing).mockRejectedValue({ response: { data: { detail: 'Category is inactive' } } })
    renderCreate()
    await waitFor(() => expect(getFormMetadata).toHaveBeenCalled())
    await fillMinimumValidFields()
    await userEvent.click(screen.getByRole('button', { name: 'Publish Auction' }))
    expect(await screen.findByText('Category is inactive')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  describe('edit mode', () => {
    it('shows a loading state, then prefills the form from the fetched listing', async () => {
      vi.mocked(getAuction).mockResolvedValue({
        id: 'listing-1', seller_id: 's1', title: 'Existing Item', category_id: 'c1', condition: 'new',
        brand: 'Acme', description: 'desc', bidding_type: 'price_up', starting_price: 50, reserve_price: 80,
        min_increment: 2, status: 'draft', start_time: '2026-01-01', end_time: '2026-01-08',
        created_at: '2026-01-01', updated_at: '2026-01-01', images: [],
      })
      renderEdit()
      expect(screen.getByText('Loading listing details...')).toBeInTheDocument()
      expect(await screen.findByDisplayValue('Existing Item')).toBeInTheDocument()
      expect(screen.getByText('Edit Draft Listing')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    })

    it('shows a load error instead of the form when the listing fails to load', async () => {
      vi.mocked(getAuction).mockRejectedValue({ response: { data: { detail: 'Listing not found' } } })
      renderEdit()
      expect(await screen.findByText('Listing not found')).toBeInTheDocument()
      expect(screen.queryByLabelText('Listing Title')).toBeNull()
    })

    it('calls updateListing (not createListing) on save', async () => {
      vi.mocked(getAuction).mockResolvedValue({
        id: 'listing-1', seller_id: 's1', title: 'Existing Item', condition: 'new',
        bidding_type: 'price_up', starting_price: 50, min_increment: 1, status: 'draft',
        start_time: '2026-01-01', end_time: '2026-01-08', created_at: '2026-01-01', updated_at: '2026-01-01', images: [],
      })
      vi.mocked(updateListing).mockResolvedValue({ ...minimalListing, id: 'listing-1' })
      renderEdit('listing-1')
      await screen.findByDisplayValue('Existing Item')
      await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
      await waitFor(() => expect(updateListing).toHaveBeenCalledWith('listing-1', expect.objectContaining({ status: 'draft' })))
      expect(createListing).not.toHaveBeenCalled()
    })

    // Regression test for a fixed bug: "Save Changes" used to submit('draft')
    // unconditionally (same handler as "Save as Draft" in create mode)
    // instead of preserving the listing's current status — editing an
    // already-*active* auction and clicking "Save Changes" silently reverted
    // it to a draft, taking a live auction off the marketplace with no
    // warning. It now preserves whatever status the listing was loaded with.
    it('"Save Changes" preserves an already-active listing\'s status instead of drafting it', async () => {
      vi.mocked(getAuction).mockResolvedValue({
        id: 'listing-1', seller_id: 's1', title: 'Existing Item', condition: 'new',
        bidding_type: 'price_up', starting_price: 50, min_increment: 1, status: 'active',
        start_time: '2026-01-01', end_time: '2026-01-08', created_at: '2026-01-01', updated_at: '2026-01-01', images: [],
      })
      vi.mocked(updateListing).mockResolvedValue({ ...minimalListing, id: 'listing-1' })
      renderEdit('listing-1')
      await screen.findByDisplayValue('Existing Item')
      await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
      await waitFor(() => expect(updateListing).toHaveBeenCalledWith('listing-1', expect.objectContaining({ status: 'active' })))
    })
  })
})
