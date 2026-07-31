import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PrimaryButton from './PrimaryButton'

describe('PrimaryButton', () => {
  it('renders a <button> and fires onClick when no "to" is given', async () => {
    const onClick = vi.fn()
    render(<PrimaryButton onClick={onClick}>Save</PrimaryButton>)
    const el = screen.getByRole('button', { name: 'Save' })
    await userEvent.click(el)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disables the native button and blocks clicks when disabled', async () => {
    const onClick = vi.fn()
    render(<PrimaryButton onClick={onClick} disabled>Save</PrimaryButton>)
    const el = screen.getByRole('button', { name: 'Save' })
    expect(el).toBeDisabled()
    await userEvent.click(el)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders a <Link> to the given route when "to" is set', () => {
    render(
      <MemoryRouter>
        <PrimaryButton to="/checkout">Continue</PrimaryButton>
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: 'Continue' })
    expect(link).toHaveAttribute('href', '/checkout')
  })

  it('renders an inert, non-navigable element (not a <Link>) when "to" and "disabled" are both set', () => {
    render(
      <MemoryRouter>
        <PrimaryButton to="/checkout" disabled>
          Continue
        </PrimaryButton>
      </MemoryRouter>
    )
    expect(screen.queryByRole('link', { name: 'Continue' })).toBeNull()
    const el = screen.getByText('Continue')
    expect(el.tagName).toBe('SPAN')
    expect(el).toHaveAttribute('aria-disabled', 'true')
    expect(el).not.toHaveAttribute('href')
  })

  it('applies the danger color variant', () => {
    render(<PrimaryButton variant="danger">Delete</PrimaryButton>)
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-red-600')
  })

  it('applies full width class when fullWidth is set', () => {
    render(<PrimaryButton fullWidth>Save</PrimaryButton>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('w-full')
  })
})
