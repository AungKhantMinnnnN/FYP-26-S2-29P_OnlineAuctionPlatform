import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

const { mockLogin } = vi.hoisted(() => ({ mockLogin: vi.fn() }))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset()
  })

  it('shows a validation error and does not call login when fields are empty', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls login with the entered credentials on submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderPage()
    await userEvent.type(screen.getByLabelText('Email or Username'), 'alice')
    await userEvent.type(screen.getByLabelText('Password'), 'hunter2')
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }))
    expect(mockLogin).toHaveBeenCalledWith('alice', 'hunter2')
  })

  it('shows the backend error detail when login rejects with one', async () => {
    mockLogin.mockRejectedValue({ response: { data: { detail: 'Account locked' } } })
    renderPage()
    await userEvent.type(screen.getByLabelText('Email or Username'), 'alice')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }))
    expect(await screen.findByText('Account locked')).toBeInTheDocument()
  })

  it('falls back to a generic message when login rejects with no detail', async () => {
    mockLogin.mockRejectedValue(new Error('network down'))
    renderPage()
    await userEvent.type(screen.getByLabelText('Email or Username'), 'alice')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }))
    expect(await screen.findByText('Invalid username/email or password')).toBeInTheDocument()
  })

  // Regression test for a fixed bug: the "fill in all fields" check always
  // validated the *trimmed* value, but the untrimmed raw state used to be
  // what got passed to login(). The username/email is now trimmed before
  // submitting too. Password is deliberately left untouched — whitespace
  // could be a legitimate part of a real password.
  it('trims the username/email before submitting but leaves the password untouched', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderPage()
    await userEvent.type(screen.getByLabelText('Email or Username'), '  alice  ')
    await userEvent.type(screen.getByLabelText('Password'), '  hunter2  ')
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }))
    expect(mockLogin).toHaveBeenCalledWith('alice', '  hunter2  ')
  })

  it('disables the submit button and shows a loading label while logging in', async () => {
    let resolveLogin: () => void = () => {}
    mockLogin.mockReturnValue(new Promise<void>((resolve) => { resolveLogin = resolve }))
    renderPage()
    await userEvent.type(screen.getByLabelText('Email or Username'), 'alice')
    await userEvent.type(screen.getByLabelText('Password'), 'hunter2')
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByRole('button', { name: 'Logging In...' })).toBeDisabled()
    resolveLogin()
  })
})
