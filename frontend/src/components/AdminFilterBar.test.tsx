import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminFilterBar from './AdminFilterBar'

describe('AdminFilterBar', () => {
  it('renders children inside the form', () => {
    render(
      <AdminFilterBar onSubmit={() => {}} onClear={() => {}}>
        <input aria-label="Search" />
      </AdminFilterBar>
    )
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
  })

  it('calls onSubmit when the Search button is clicked', async () => {
    const onSubmit = vi.fn((e) => e.preventDefault())
    render(
      <AdminFilterBar onSubmit={onSubmit} onClear={() => {}}>
        <div />
      </AdminFilterBar>
    )
    await userEvent.click(screen.getByRole('button', { name: /search/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('hides the Clear button by default', () => {
    render(
      <AdminFilterBar onSubmit={() => {}} onClear={() => {}}>
        <div />
      </AdminFilterBar>
    )
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('shows the Clear button and calls onClear when showClear is true', async () => {
    const onClear = vi.fn()
    render(
      <AdminFilterBar onSubmit={() => {}} onClear={onClear} showClear>
        <div />
      </AdminFilterBar>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
