import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOptions } from './useOptions'
import { getOptions } from '../api/adminApi'

vi.mock('../api/adminApi', () => ({
  getOptions: vi.fn(),
}))

const mockedGetOptions = vi.mocked(getOptions)

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useOptions', () => {
  beforeEach(() => {
    mockedGetOptions.mockReset()
  })

  it('returns an empty array before the query resolves', () => {
    mockedGetOptions.mockReturnValue(new Promise(() => {}))
    const queryClient = new QueryClient()
    const { result } = renderHook(() => useOptions('condition'), { wrapper: wrapper(queryClient) })
    expect(result.current).toEqual([])
  })

  it('returns the fetched options once the query resolves', async () => {
    const items = [{ value: 'new', label: 'New' }]
    mockedGetOptions.mockResolvedValue(items)
    const queryClient = new QueryClient()
    const { result } = renderHook(() => useOptions('condition'), { wrapper: wrapper(queryClient) })

    await waitFor(() => expect(result.current).toEqual(items))
    expect(getOptions).toHaveBeenCalledWith('condition')
  })

  it('caches per setKey for the session — a second mount does not refetch', async () => {
    const items = [{ value: 'new', label: 'New' }]
    mockedGetOptions.mockResolvedValue(items)
    const queryClient = new QueryClient()

    const first = renderHook(() => useOptions('condition'), { wrapper: wrapper(queryClient) })
    await waitFor(() => expect(first.result.current).toEqual(items))

    renderHook(() => useOptions('condition'), { wrapper: wrapper(queryClient) })
    expect(getOptions).toHaveBeenCalledTimes(1)
  })

  it('uses a separate cache entry per setKey', async () => {
    mockedGetOptions.mockImplementation(async (setKey: string) => [{ value: setKey, label: setKey }])
    const queryClient = new QueryClient()

    const conditionHook = renderHook(() => useOptions('condition'), { wrapper: wrapper(queryClient) })
    const roleHook = renderHook(() => useOptions('role'), { wrapper: wrapper(queryClient) })

    await waitFor(() => expect(conditionHook.result.current).toEqual([{ value: 'condition', label: 'condition' }]))
    await waitFor(() => expect(roleHook.result.current).toEqual([{ value: 'role', label: 'role' }]))
    expect(getOptions).toHaveBeenCalledWith('condition')
    expect(getOptions).toHaveBeenCalledWith('role')
  })
})
