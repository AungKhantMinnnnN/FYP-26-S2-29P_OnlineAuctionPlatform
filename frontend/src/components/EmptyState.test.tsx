import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders the message', () => {
    render(<EmptyState message="Nothing here yet." />)
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
  })

  it('renders no action link when actionText/actionTo are omitted', () => {
    render(<EmptyState message="Nothing here yet." />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders no action link when only actionText is given without actionTo', () => {
    render(<EmptyState message="Nothing here yet." actionText="Browse" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders the action link when both actionText and actionTo are given', () => {
    render(
      <MemoryRouter>
        <EmptyState message="Nothing here yet." actionText="Browse auctions" actionTo="/browse" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Browse auctions' })).toHaveAttribute('href', '/browse')
  })
})
