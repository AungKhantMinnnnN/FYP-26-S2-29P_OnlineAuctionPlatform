import { useQuery } from '@tanstack/react-query'
import { getOptions, type OptionItem } from '../api/adminApi'

// Options rarely change, so cache them for the session (see option_sets table).
export function useOptions(setKey: string): OptionItem[] {
  const { data } = useQuery({
    queryKey: ['admin', 'options', setKey],
    queryFn: () => getOptions(setKey),
    staleTime: Infinity,
  })
  return data ?? []
}
