import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SectionHeader from './SectionHeader'

describe('SectionHeader', () => {
  it('renders the title', () => {
    render(<SectionHeader title="My Listings" />)
    expect(screen.getByRole('heading', { name: 'My Listings' })).toBeInTheDocument()
  })

  it('renders the subtitle only when provided', () => {
    const { rerender } = render(<SectionHeader title="My Listings" />)
    expect(screen.queryByText('subtitle text')).toBeNull()
    rerender(<SectionHeader title="My Listings" subtitle="subtitle text" />)
    expect(screen.getByText('subtitle text')).toBeInTheDocument()
  })

  it('renders no action link unless both actionText and actionTo are given', () => {
    render(<SectionHeader title="My Listings" actionText="Create" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders the action link when both actionText and actionTo are given', () => {
    render(
      <MemoryRouter>
        <SectionHeader title="My Listings" actionText="Create" actionTo="/create-listing" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/create-listing')
  })
})
