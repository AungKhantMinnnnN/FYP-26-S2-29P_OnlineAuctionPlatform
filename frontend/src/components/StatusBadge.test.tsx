import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('applies the matching style for a known status', () => {
    render(<StatusBadge status="active" />)
    expect(screen.getByText('active')).toHaveClass('bg-emerald-50')
  })

  it('matches status case-insensitively against the style map', () => {
    render(<StatusBadge status="ACTIVE" />)
    expect(screen.getByText('ACTIVE')).toHaveClass('bg-emerald-50')
  })

  it('falls back to the "pending" (amber) style for an unrecognized status', () => {
    render(<StatusBadge status="totally-unknown" />)
    expect(screen.getByText('totally-unknown')).toHaveClass('bg-amber-50')
  })

  // CSS `capitalize` only uppercases the first letter, it doesn't lowercase the rest,
  // so an all-caps status like "ACTIVE" renders as "ACTIVE" even though the style
  // lookup normalizes it.
  it('does not actually normalize the displayed casing despite the "capitalize" class (known cosmetic bug)', () => {
    render(<StatusBadge status="ACTIVE" />)
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.queryByText('Active')).toBeNull()
  })
})
