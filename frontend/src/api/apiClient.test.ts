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
    locationMock = { href: '' }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: locationMock as unknown as Location,
    })
  })

  it('sends withCredentials so the session cookie rides along automatically', async () => {
    let captured: InternalAxiosRequestConfig | undefined
    mockAdapterResolving((config) => { captured = config })

    await apiClient.get('/ping')

    expect(captured?.withCredentials).toBe(true)
  })

  it('redirects to /login on a 401 from a protected, non-exempt request', async () => {
    mockAdapterRejecting401()

    await expect(apiClient.get('/auctions/protected')).rejects.toBeTruthy()

    expect(locationMock.href).toBe('/login')
  })

  it('does not redirect on a 401 from the login request itself', async () => {
    mockAdapterRejecting401()

    await expect(apiClient.post('/auth/login', {})).rejects.toBeTruthy()

    expect(locationMock.href).toBe('')
  })

  it('does not redirect on a 401 from get_current_user (the normal "not logged in" shape)', async () => {
    mockAdapterRejecting401()

    await expect(apiClient.get('/auth/get_current_user')).rejects.toBeTruthy()

    expect(locationMock.href).toBe('')
  })
})
