import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import VersionHistoryPanel from './VersionHistoryPanel'
import { listVersions, getVersion, rollback } from '../api/cmsApi'

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }))

vi.mock('../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
vi.mock('../api/cmsApi', () => ({
  listVersions: vi.fn(),
  getVersion: vi.fn(),
  rollback: vi.fn(),
}))

const versions = [
  { id: 'v3', note: 'publish', created_by: 'u1', created_at: '2026-03-01T00:00:00Z' },
  { id: 'v2', note: 'rollback to 2026-01-15T00:00:00Z', created_by: 'u2', created_at: '2026-02-01T00:00:00Z' },
  { id: 'v1', note: null, created_by: 'u1', created_at: '2026-01-01T00:00:00Z' },
]

function renderPanel(overrides: Partial<React.ComponentProps<typeof VersionHistoryPanel>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const props: React.ComponentProps<typeof VersionHistoryPanel> = {
    slug: 'landing',
    onClose: vi.fn(),
    onPreview: vi.fn(),
    onRestored: vi.fn(),
    ...overrides,
  }
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <VersionHistoryPanel {...props} />
    </QueryClientProvider>
  )
  return { ...utils, props }
}

describe('VersionHistoryPanel', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } })
    vi.mocked(listVersions).mockReset()
    vi.mocked(getVersion).mockReset()
    vi.mocked(rollback).mockReset()
  })

  it('shows "No published versions yet." when the list is empty', async () => {
    vi.mocked(listVersions).mockResolvedValue([])
    renderPanel()
    await waitFor(() => expect(screen.getByText('No published versions yet.')).toBeInTheDocument())
  })

  it('labels the first entry "Current (published)" and shows dates for the rest', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    renderPanel()
    await waitFor(() => expect(screen.getByText('Current (published)')).toBeInTheDocument())
    // v1/v2 are not index 0, so they're labeled by their formatted date instead.
    expect(screen.getByText('01 Jan 2026')).toBeInTheDocument()
    expect(screen.getByText('01 Feb 2026')).toBeInTheDocument()
  })

  it('tags a version with "You" only when created_by matches the current user', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    renderPanel()
    await waitFor(() => expect(screen.getAllByText('You')).toHaveLength(2)) // v3 and v1 are created_by u1
  })

  it('describes a "publish" note as "Published from the editor"', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    renderPanel()
    await waitFor(() => expect(screen.getByText('Published from the editor')).toBeInTheDocument())
  })

  it('describes a "rollback to <date>" note with the restored-from date', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    renderPanel()
    await waitFor(() =>
      expect(screen.getByText('Restored from a version published 15 Jan 2026')).toBeInTheDocument()
    )
  })

  it('does not show a note line for a version with no note', async () => {
    vi.mocked(listVersions).mockResolvedValue([versions[2]])
    renderPanel()
    await waitFor(() => expect(screen.getByText('01 Jan 2026')).toBeInTheDocument())
    expect(screen.queryByText('Published from the editor')).toBeNull()
  })

  it('does not show a Restore button for the current (index 0) version', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    renderPanel()
    await waitFor(() => expect(screen.getAllByText('Preview')).toHaveLength(3))
    expect(screen.getAllByText('Restore')).toHaveLength(2) // only the two non-current versions
  })

  it('Preview calls getVersion and forwards content + formatted date to onPreview', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    vi.mocked(getVersion).mockResolvedValue({ id: 'v1', content: { root: {}, content: [] }, created_at: '2026-01-01T00:00:00Z' })
    const { props } = renderPanel()
    await waitFor(() => expect(screen.getAllByText('Preview')).toHaveLength(3))
    await userEvent.click(screen.getAllByText('Preview')[2]) // v1
    await waitFor(() => expect(props.onPreview).toHaveBeenCalledWith({ root: {}, content: [] }, '01 Jan 2026'))
  })

  it('shows an error message when the preview fetch fails', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    vi.mocked(getVersion).mockRejectedValue({ response: { data: { detail: 'Version not found' } } })
    renderPanel()
    await waitFor(() => expect(screen.getAllByText('Preview')).toHaveLength(3))
    await userEvent.click(screen.getAllByText('Preview')[2])
    await waitFor(() => expect(screen.getByText('Version not found')).toBeInTheDocument())
  })

  it('Restore opens a confirmation modal instead of restoring immediately', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    renderPanel()
    await waitFor(() => expect(screen.getAllByText('Restore')).toHaveLength(2))
    await userEvent.click(screen.getAllByText('Restore')[0])
    expect(screen.getByText('Restore this version?')).toBeInTheDocument()
    expect(rollback).not.toHaveBeenCalled()
  })

  it('confirming the modal calls rollback and onRestored', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    vi.mocked(rollback).mockResolvedValue({ slug: 'landing', content: { root: {}, content: [] }, updated_at: null })
    const { props } = renderPanel()
    await waitFor(() => expect(screen.getAllByText('Restore')).toHaveLength(2))
    await userEvent.click(screen.getAllByText('Restore')[0]) // v2
    // Modal's confirm button is rendered last, after the remaining row's Restore button.
    const restoreButtons = screen.getAllByRole('button', { name: 'Restore' })
    await userEvent.click(restoreButtons[restoreButtons.length - 1])
    await waitFor(() => expect(rollback).toHaveBeenCalledWith('landing', 'v2'))
    expect(props.onRestored).toHaveBeenCalledTimes(1)
  })

  it('Cancel in the modal closes it without calling rollback', async () => {
    vi.mocked(listVersions).mockResolvedValue(versions)
    renderPanel()
    await waitFor(() => expect(screen.getAllByText('Restore')).toHaveLength(2))
    await userEvent.click(screen.getAllByText('Restore')[0])
    await userEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Restore this version?')).toBeNull()
    expect(rollback).not.toHaveBeenCalled()
  })

  it('calls onClose when the close (X) button is clicked', async () => {
    vi.mocked(listVersions).mockResolvedValue([])
    const { props } = renderPanel()
    await waitFor(() => expect(screen.getByText('No published versions yet.')).toBeInTheDocument())
    const closeButtons = screen.getAllByRole('button')
    await userEvent.click(closeButtons[0]) // header X is the first button rendered
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})
