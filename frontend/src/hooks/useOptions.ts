import { useQuery } from '@tanstack/react-query'
import { getOptions, type OptionItem } from '../api/adminApi'

// Loads a dropdown's options from the DB-backed catalogue (see option_sets).
// Options rarely change, so cache them for the session.
export function useOptions(setKey: string): OptionItem[] {
  const { data } = useQuery({
    queryKey: ['admin', 'options', setKey],
    queryFn: () => getOptions(setKey),
    staleTime: Infinity,
  })
  return data ?? []
}
