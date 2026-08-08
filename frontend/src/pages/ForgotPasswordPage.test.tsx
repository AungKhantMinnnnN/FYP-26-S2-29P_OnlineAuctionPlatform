import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ForgotPasswordPage from './ForgotPasswordPage'
import { requestPasswordReset } from '../api/authApi'

vi.mock('../api/authApi', () => ({ requestPasswordReset: vi.fn() }))

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(requestPasswordReset).mockReset()
  })

  // The email input has the native `required` attribute, so jsdom's constraint
  // validation blocks the submit before handleSubmit's own empty-check ever runs.
  it('blocks submission via native required-field validation when the email is empty', async () => {
    renderPage()
    const input = screen.getByLabelText('Email') as HTMLInputElement
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(input.validity.valueMissing).toBe(true)
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('trims the email before sending it', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ message: 'sent' })
    renderPage()
    await userEvent.type(screen.getByLabelText('Email'), '  bob@x.com  ')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(requestPasswordReset).toHaveBeenCalledWith('bob@x.com')
  })

  it('shows the success panel and a "send another" reset button after submitting', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ message: 'sent' })
    renderPage()
    await userEvent.type(screen.getByLabelText('Email'), 'bob@x.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText(/password reset link has been sent/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send another link' }))
    expect(screen.getByLabelText('Email')).toHaveValue('')
  })

  it('shows the backend error detail on failure and stays on the form', async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue({ response: { data: { detail: 'Too many requests' } } })
    renderPage()
    await userEvent.type(screen.getByLabelText('Email'), 'bob@x.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText('Too many requests')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })
})
