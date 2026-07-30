import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import CountdownBadge from './CountdownBadge'

describe('CountdownBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "Ended" once the end time has passed', () => {
    render(<CountdownBadge endTime={new Date('2025-12-31T00:00:00Z')} />)
    expect(screen.getByText('Ended')).toBeInTheDocument()
  })

  it('renders the remaining hours/minutes/seconds', () => {
    render(<CountdownBadge endTime={new Date('2026-01-01T02:03:04Z')} />)
    expect(screen.getByText('2h 3m 4s')).toBeInTheDocument()
  })

  it('counts down every second via its internal interval', () => {
    render(<CountdownBadge endTime={new Date('2026-01-01T00:00:05Z')} />)
    expect(screen.getByText('0h 0m 5s')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('0h 0m 4s')).toBeInTheDocument()
  })

  it('uses the red urgency style under 5 minutes remaining', () => {
    render(<CountdownBadge endTime={new Date('2026-01-01T00:04:59Z')} />)
    expect(screen.getByText('0h 4m 59s')).toHaveClass('bg-red-50')
  })

  it('uses the amber urgency style under 1 hour remaining', () => {
    render(<CountdownBadge endTime={new Date('2026-01-01T00:30:00Z')} />)
    expect(screen.getByText('0h 30m 0s')).toHaveClass('bg-amber-50')
  })

  it('uses the default style for more than 1 hour remaining', () => {
    render(<CountdownBadge endTime={new Date('2026-01-01T05:00:00Z')} />)
    expect(screen.getByText('5h 0m 0s')).toHaveClass('bg-emerald-50')
  })
})
