import { authorizedJson } from '@/shared/api/authorizedClient'
import type {
  AuditLogDetails,
  DashboardSummary,
  StorageMetrics,
  VpsStats,
  VpsStatsField,
} from '../types'

export function getDashboardSummary() {
  return authorizedJson<DashboardSummary>('/dashboard/summary')
}

export function getStorageMetrics() {
  return authorizedJson<StorageMetrics>('/system/storage')
}

export function getVpsStats(
  field: VpsStatsField,
  start: string,
  end: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ start, end })
  return authorizedJson<VpsStats>(`/system/vps-stats/${field}?${params}`, { signal })
}

export function getAuditLog(id: string) {
  return authorizedJson<AuditLogDetails>(`/audit/${id}`)
}
