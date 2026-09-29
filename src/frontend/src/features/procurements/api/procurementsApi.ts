import { authorizedJson } from '@/shared/api/authorizedClient'
import type { ProcurementRow, UpdateProcurementRequest } from '../types'

export function getProcurements(signal?: AbortSignal) {
  return authorizedJson<ProcurementRow[]>('/procurements', { signal })
}

export function convertRequest(orderId: string) {
  return authorizedJson<ProcurementRow[]>(`/procurements/orders/${orderId}/convert`, {
    method: 'POST',
  })
}

export function updateProcurement(id: string, request: UpdateProcurementRequest) {
  return authorizedJson<ProcurementRow>(`/procurements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export function deleteProcurement(id: string) {
  return authorizedJson<void>(`/procurements/${id}`, { method: 'DELETE' })
}
