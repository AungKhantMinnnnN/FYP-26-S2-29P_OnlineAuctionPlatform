import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Gavel } from 'lucide-react'
import DashboardStatCard from './DashboardStatCard'

describe('DashboardStatCard', () => {
  it('renders title and value', () => {
    render(<DashboardStatCard title="Active Bids" value={12} />)
    expect(screen.getByText('Active Bids')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders a string value as-is', () => {
    render(<DashboardStatCard title="Balance" value="$120.50" />)
    expect(screen.getByText('$120.50')).toBeInTheDocument()
  })

  it('renders no icon when none is given', () => {
    const { container } = render(<DashboardStatCard title="Active Bids" value={12} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders the icon when given', () => {
    const { container } = render(<DashboardStatCard title="Active Bids" value={12} icon={Gavel} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders trend text only when provided', () => {
    const { rerender } = render(<DashboardStatCard title="Active Bids" value={12} />)
    expect(screen.queryByText('+3 this week')).toBeNull()
    rerender(<DashboardStatCard title="Active Bids" value={12} trend="+3 this week" />)
    expect(screen.getByText('+3 this week')).toBeInTheDocument()
  })
})
