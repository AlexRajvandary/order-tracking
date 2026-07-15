import { useQuery } from '@tanstack/react-query'
import { getStorageMetrics } from './dashboardApi'

export function useStorageMetrics() {
  return useQuery({
    queryKey: ['storage-metrics'],
    queryFn: getStorageMetrics,
  })
}
