import { authorizedJson } from '@/shared/api/authorizedClient'
import type { AuditLogDetails, DashboardSummary } from '../types'

export function getDashboardSummary() {
  return authorizedJson<DashboardSummary>('/dashboard/summary')
}

export function getAuditLog(id: string) {
  return authorizedJson<AuditLogDetails>(`/audit/${id}`)
}
