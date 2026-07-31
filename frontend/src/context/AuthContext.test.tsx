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
    sessionStorage.clear()
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

  it('finishes loading unauthenticated when there is no stored token', async () => {
    renderWithProviders(<Harness />)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('authenticated').textContent).toBe('false')
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  it('fetches the current user on mount when a token is already stored', async () => {
    sessionStorage.setItem('token', 'existing-token')
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseUser })

    renderWithProviders(<Harness />)

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
    expect(apiClient.get).toHaveBeenCalledWith(
      '/auth/get_current_user',
      expect.objectContaining({ headers: { Authorization: 'Bearer existing-token' } })
    )
  })

  it('logs out if the stored token fails to resolve to a user', async () => {
    sessionStorage.setItem('token', 'stale-token')
    vi.mocked(apiClient.get).mockRejectedValue(new Error('401'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderWithProviders(<Harness />)

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(screen.getByTestId('authenticated').textContent).toBe('false')
    spy.mockRestore()
  })

  it('login stores the token, loads the profile, and navigates to /dashboard', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { access_token: 'new-token', token_type: 'bearer' } })
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseUser })

    renderWithProviders(<Harness />)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('login'))

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
    expect(sessionStorage.getItem('token')).toBe('new-token')
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('logout clears the stored token and user state', async () => {
    sessionStorage.setItem('token', 'existing-token')
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseUser })

    renderWithProviders(<Harness />)
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
    await userEvent.click(screen.getByText('logout'))

    expect(sessionStorage.getItem('token')).toBeNull()
    expect(screen.getByTestId('authenticated').textContent).toBe('false')
  })

  it('adjustBalance rounds the result to 2 decimal places', async () => {
    sessionStorage.setItem('token', 'existing-token')
    vi.mocked(apiClient.get).mockResolvedValue({ data: { ...baseUser, balance: 10.1 } })

    renderWithProviders(<Harness />)
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
    await userEvent.click(screen.getByText('adjust'))

    await waitFor(() => expect(screen.getByTestId('balance').textContent).toBe('10.3'))
  })
})
