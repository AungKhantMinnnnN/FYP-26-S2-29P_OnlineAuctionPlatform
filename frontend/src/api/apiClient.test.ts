import { describe, it, expect, beforeEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import apiClient from './apiClient'

function mockAdapterResolving(capture: (config: InternalAxiosRequestConfig) => void) {
  apiClient.defaults.adapter = async (config) => {
    capture(config as InternalAxiosRequestConfig)
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
  }
}

function mockAdapterRejecting401() {
  apiClient.defaults.adapter = async (config) => {
    const response = { status: 401, data: {}, statusText: 'Unauthorized', headers: {}, config }
    const error = Object.assign(new Error('Unauthorized'), {
      isAxiosError: true,
      config,
      response,
    })
    throw error
  }
}

describe('apiClient', () => {
  let locationMock: { href: string }

  beforeEach(() => {
    sessionStorage.clear()
    locationMock = { href: '' }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: locationMock as unknown as Location,
    })
  })

  it('attaches an Authorization header when a token is stored', async () => {
    sessionStorage.setItem('token', 'abc123')
    let captured: InternalAxiosRequestConfig | undefined
    mockAdapterResolving((config) => { captured = config })

    await apiClient.get('/ping')

    expect((captured?.headers as Record<string, string> | undefined)?.Authorization).toBe('Bearer abc123')
  })

  it('omits the Authorization header when there is no stored token', async () => {
    let captured: InternalAxiosRequestConfig | undefined
    mockAdapterResolving((config) => { captured = config })

    await apiClient.get('/ping')

    expect((captured?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined()
  })

  it('clears the token and redirects to /login on a 401 from a non-login request', async () => {
    sessionStorage.setItem('token', 'abc123')
    mockAdapterRejecting401()

    await expect(apiClient.get('/auctions/protected')).rejects.toBeTruthy()

    expect(sessionStorage.getItem('token')).toBeNull()
    expect(locationMock.href).toBe('/login')
  })

  it('does not clear the token or redirect on a 401 from the login request itself', async () => {
    sessionStorage.setItem('token', 'abc123')
    mockAdapterRejecting401()

    await expect(apiClient.post('/auth/login', {})).rejects.toBeTruthy()

    expect(sessionStorage.getItem('token')).toBe('abc123')
    expect(locationMock.href).toBe('')
  })
})
