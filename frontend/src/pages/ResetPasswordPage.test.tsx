import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ResetPasswordPage from './ResetPasswordPage'
import { confirmPasswordReset } from '../api/authApi'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../api/authApi', () => ({ confirmPasswordReset: vi.fn() }))

function renderPage(token = 'valid-token') {
  const entry = token ? `/reset-password?token=${token}` : '/reset-password'
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ResetPasswordPage />
    </MemoryRouter>
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    vi.mocked(confirmPasswordReset).mockReset()
  })

  it('warns when there is no token in the URL and disables the submit button', () => {
    renderPage('')
    expect(screen.getByText(/No reset token found/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeDisabled()
  })

  it('rejects a password shorter than 8 characters', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText('New password'), 'short')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument()
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('rejects a mismatched confirmation', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText('New password'), 'longenough1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'longenough2')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('calls confirmPasswordReset with the token and new password, then redirects after a delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(confirmPasswordReset).mockResolvedValue({ message: 'ok' })
    renderPage('tok-123')
    await userEvent.type(screen.getByLabelText('New password'), 'longenough1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'longenough1')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(confirmPasswordReset).toHaveBeenCalledWith('tok-123', 'longenough1')
    expect(await screen.findByText(/Password reset successfully/)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1800)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
    vi.useRealTimers()
  })

  it('shows the backend error detail on failure', async () => {
    vi.mocked(confirmPasswordReset).mockRejectedValue({ response: { data: { detail: 'Token expired' } } })
    renderPage()
    await userEvent.type(screen.getByLabelText('New password'), 'longenough1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'longenough1')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(await screen.findByText('Token expired')).toBeInTheDocument()
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
