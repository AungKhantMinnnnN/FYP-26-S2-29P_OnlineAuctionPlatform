import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SecondaryButton from './SecondaryButton'

describe('SecondaryButton', () => {
  it('renders a <button> and fires onClick when no "to" is given', async () => {
    const onClick = vi.fn()
    render(<SecondaryButton onClick={onClick}>Cancel</SecondaryButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disables the native button and blocks clicks when disabled', async () => {
    const onClick = vi.fn()
    render(<SecondaryButton onClick={onClick} disabled>Cancel</SecondaryButton>)
    const el = screen.getByRole('button', { name: 'Cancel' })
    expect(el).toBeDisabled()
    await userEvent.click(el)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders a <Link> to the given route when "to" is set', () => {
    render(
      <MemoryRouter>
        <SecondaryButton to="/browse">Back</SecondaryButton>
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/browse')
  })

  it('renders an inert, non-navigable element (not a <Link>) when "to" and "disabled" are both set', () => {
    render(
      <MemoryRouter>
        <SecondaryButton to="/browse" disabled>
          Back
        </SecondaryButton>
      </MemoryRouter>
    )
    expect(screen.queryByRole('link', { name: 'Back' })).toBeNull()
    const el = screen.getByText('Back')
    expect(el.tagName).toBe('SPAN')
    expect(el).toHaveAttribute('aria-disabled', 'true')
  })

  it('applies full width class when fullWidth is set', () => {
    render(<SecondaryButton fullWidth>Cancel</SecondaryButton>)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('w-full')
  })
})
