import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './AuthContext'
import apiClient from '../api/apiClient'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const baseUser = {
  id: '1',
  username: 'bob',
  email: 'b@x.com',
  role: 'user',
  balance: 10,
  email_verified: true,
  subscription_tier: 'free',
}

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  )
}

function Harness() {
  const auth = useAuth()
  return (
    <div>
      <div data-testid="loading">{String(auth.loading)}</div>
      <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="balance">{auth.user?.balance ?? 'none'}</div>
      <button onClick={() => auth.login('user', 'pass').catch(() => {})}>login</button>
      <button onClick={() => auth.logout()}>logout</button>
      <button onClick={() => auth.adjustBalance(0.2)}>adjust</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
    mockNavigate.mockReset()
  })

  it('throws when useAuth is called outside an AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Bare = () => {
      useAuth()
      return null
    }
    expect(() => render(<Bare />)).toThrow('useAuth must be used within an AuthProvider')
    spy.mockRestore()
  })

  it('finishes loading unauthenticated when get_current_user rejects (no session cookie)', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('401'))

    renderWithProviders(<Harness />)

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('authenticated').textContent).toBe('false')
    expect(apiClient.get).toHaveBeenCalledWith('/auth/get_current_user')
  })

  it('is authenticated on mount when get_current_user resolves (a valid session cookie is present)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseUser })

    renderWithProviders(<Harness />)

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
    expect(screen.getByTestId('balance').textContent).toBe('10')
  })

  it('login posts credentials (no token handling), loads the profile, and navigates to /dashboard', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('401')) // initial mount check
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} }) // login just sets a cookie server-side
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: baseUser }) // post-login profile fetch

    renderWithProviders(<Harness />)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('login'))

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      username_or_email: 'user',
      password: 'pass',
    })
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('logout calls the logout endpoint and clears local user state', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseUser })
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'Logged out.' } })

    renderWithProviders(<Harness />)
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
    await userEvent.click(screen.getByText('logout'))

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'))
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout')
  })

  it('logout still clears local state even if the server call fails', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseUser })
    vi.mocked(apiClient.post).mockRejectedValue(new Error('network error'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderWithProviders(<Harness />)
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
    await userEvent.click(screen.getByText('logout'))

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'))
    spy.mockRestore()
  })

  it('adjustBalance rounds the result to 2 decimal places', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { ...baseUser, balance: 10.1 } })

    renderWithProviders(<Harness />)
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
    await userEvent.click(screen.getByText('adjust'))

    await waitFor(() => expect(screen.getByTestId('balance').textContent).toBe('10.3'))
  })
})
