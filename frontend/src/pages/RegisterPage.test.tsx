import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from './RegisterPage'

const { mockNavigate, mockRegister, mockLogin } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockRegister: vi.fn(),
  mockLogin: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister, login: mockLogin }),
}))

async function fillRequiredFields(agree = true) {
  await userEvent.type(screen.getByLabelText('Full Name'), 'Alex Tan')
  await userEvent.type(screen.getByLabelText('Username'), 'alextan')
  await userEvent.type(screen.getByLabelText('Email'), 'alex@example.com')
  await userEvent.type(screen.getByLabelText('Password'), 'password123')
  await userEvent.type(screen.getByLabelText('Confirm Password'), 'password123')
  if (agree) await userEvent.click(screen.getByRole('checkbox'))
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockRegister.mockReset()
    mockLogin.mockReset()
  })

  it('disables the submit button until the terms checkbox is checked', async () => {
    renderPage()
    await fillRequiredFields(false)
    expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled()
  })

  it('shows an error and does not register when password/confirm mismatch', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText('Full Name'), 'Alex Tan')
    await userEvent.type(screen.getByLabelText('Username'), 'alextan')
    await userEvent.type(screen.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'different')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('registers, logs in, and navigates to onboarding on success', async () => {
    mockRegister.mockResolvedValue(undefined)
    mockLogin.mockResolvedValue(undefined)
    renderPage()
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(mockRegister).toHaveBeenCalledWith(
      'Alex Tan', 'alextan', 'alex@example.com', 'password123',
      undefined, undefined, undefined, '', ''
    )
    expect(mockLogin).toHaveBeenCalledWith('alextan', 'password123')
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding/interests', { replace: true })
  })

  it('shows the backend error detail when register rejects with one', async () => {
    mockRegister.mockRejectedValue({ response: { data: { detail: 'Username already taken' } } })
    renderPage()
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(await screen.findByText('Username already taken')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // Regression test for a fixed inconsistency: RegisterPage now enforces the
  // same 8-character minimum as ResetPasswordPage for the same underlying
  // credential.
  it('rejects a password shorter than 8 characters, matching ResetPasswordPage', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText('Full Name'), 'Alex Tan')
    await userEvent.type(screen.getByLabelText('Username'), 'alextan')
    await userEvent.type(screen.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'short1')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'short1')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  // Regression test for a fixed defense-in-depth gap: handleSubmit now checks
  // `agreed` itself instead of relying solely on the submit button's
  // `disabled` attribute, so a direct form submit (bypassing the button) no
  // longer skips the terms-agreement gate.
  it('blocks a direct form submit (bypassing the disabled button) when terms are not agreed', async () => {
    renderPage()
    await fillRequiredFields(false) // deliberately do NOT check the terms box
    const form = screen.getByRole('button', { name: 'Register' }).closest('form')!
    form.requestSubmit()
    expect(await screen.findByText('Please agree to the Terms of Service and Privacy Policy.')).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })
})
