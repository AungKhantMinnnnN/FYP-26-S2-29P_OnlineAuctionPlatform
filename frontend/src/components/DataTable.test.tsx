import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DataTable from './DataTable'

describe('DataTable', () => {
  it('renders headers and row cells', () => {
    render(
      <DataTable
        headers={['Name', 'Status']}
        rows={[
          ['Watch', 'Active'],
          ['Coin', 'Ended'],
        ]}
      />
    )
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByText('Watch')).toBeInTheDocument()
    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3) // 1 header + 2 data rows
  })

  it('renders the default empty message when rows is empty', () => {
    render(<DataTable headers={['Name']} rows={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('renders a custom empty message', () => {
    render(<DataTable headers={['Name']} rows={[]} emptyMessage="No listings yet." />)
    expect(screen.getByText('No listings yet.')).toBeInTheDocument()
  })

  it('renders the empty state when rows is null/undefined rather than throwing', () => {
    render(<DataTable headers={['Name']} rows={undefined as unknown as React.ReactNode[][]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })
})
