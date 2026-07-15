import { authorizedJson } from '@/shared/api/authorizedClient'
import type { AuditLogDetails, DashboardSummary, StorageMetrics } from '../types'

export function getDashboardSummary() {
  return authorizedJson<DashboardSummary>('/dashboard/summary')
}

export function getStorageMetrics() {
  return authorizedJson<StorageMetrics>('/system/storage')
}

export function getAuditLog(id: string) {
  return authorizedJson<AuditLogDetails>(`/audit/${id}`)
}
