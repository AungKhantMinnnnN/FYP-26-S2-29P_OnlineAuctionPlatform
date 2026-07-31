import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SearchBar from './SearchBar'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('SearchBar', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  it('seeds its input from the current ?q= search param', () => {
    render(
      <MemoryRouter initialEntries={['/browse?q=vintage']}>
        <SearchBar />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText('Search auctions...')).toHaveValue('vintage')
  })

  it('navigates to /browse?q=<encoded query> on submit', async () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    )
    const input = screen.getByPlaceholderText('Search auctions...')
    await userEvent.type(input, 'gold watch')
    await userEvent.keyboard('{Enter}')
    expect(mockNavigate).toHaveBeenCalledWith('/browse?q=gold%20watch')
  })

  it('navigates to plain /browse (no query) when the input is empty', async () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    )
    const form = screen.getByPlaceholderText('Search auctions...').closest('form')!
    form.requestSubmit()
    expect(mockNavigate).toHaveBeenCalledWith('/browse')
  })

  it('navigates to plain /browse when the input is only whitespace', async () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    )
    const input = screen.getByPlaceholderText('Search auctions...')
    await userEvent.type(input, '   ')
    const form = input.closest('form')!
    form.requestSubmit()
    expect(mockNavigate).toHaveBeenCalledWith('/browse')
  })
})
