import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VerifyEmailPage from './VerifyEmailPage'
import { confirmEmailVerification } from '../api/authApi'

vi.mock('../api/authApi', () => ({ confirmEmailVerification: vi.fn() }))

function renderPage(token = 'tok-123') {
  const entry = token ? `/verify-email?token=${token}` : '/verify-email'
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <VerifyEmailPage />
    </MemoryRouter>
  )
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.mocked(confirmEmailVerification).mockReset()
  })

  it('shows an error immediately when there is no token, without calling the API', () => {
    renderPage('')
    expect(screen.getByText('Verification link is missing a token.')).toBeInTheDocument()
    expect(confirmEmailVerification).not.toHaveBeenCalled()
  })

  it('shows the pending state, then success once verification resolves', async () => {
    vi.mocked(confirmEmailVerification).mockResolvedValue({ message: 'All set!' })
    renderPage()
    expect(screen.getByText('Verifying email')).toBeInTheDocument()
    expect(await screen.findByText('Email verified')).toBeInTheDocument()
    expect(screen.getByText('All set!')).toBeInTheDocument()
    expect(confirmEmailVerification).toHaveBeenCalledWith('tok-123')
    expect(screen.getByRole('link', { name: 'Go to login' })).toHaveAttribute('href', '/login')
  })

  it('shows the backend error detail on failure', async () => {
    vi.mocked(confirmEmailVerification).mockRejectedValue({ response: { data: { detail: 'Link expired' } } })
    renderPage()
    expect(await screen.findByText('Verification failed')).toBeInTheDocument()
    expect(screen.getByText('Link expired')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/login')
  })

  it('falls back to a generic message when the rejection has no detail', async () => {
    vi.mocked(confirmEmailVerification).mockRejectedValue(new Error('network down'))
    renderPage()
    expect(await screen.findByText(/link may be expired or invalid/)).toBeInTheDocument()
  })
})
