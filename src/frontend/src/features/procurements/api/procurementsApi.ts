import { authorizedJson, authorizedUpload } from '@/shared/api/authorizedClient'
import type { ProcurementAttachment, ProcurementRow, ProcurementStatus, UpdateProcurementRequest } from '../types'

export function getProcurements(signal?: AbortSignal) {
  return authorizedJson<ProcurementRow[]>('/procurements', { signal })
}

export function getProcurementArchive(signal?: AbortSignal) {
  return authorizedJson<ProcurementRow[]>('/procurements/archive', { signal })
}

export function transitionProcurement(id: string, request: { status?: ProcurementStatus; targetStage?: string }) {
  return authorizedJson<ProcurementRow>(`/procurements/${id}/transition`, { method: 'POST', body: JSON.stringify(request) })
}

export type ProcurementError = { id: string; procurementId: string; text: string; statusAtCreation: ProcurementStatus; stageAtCreation: string; createdAt: string; authorId: string | null; isBlocking: boolean; isResolved: boolean; resolvedAt: string | null; resolvedByAdminId: string | null }
export function getProcurementErrors(id: string, signal?: AbortSignal) {
  return authorizedJson<ProcurementError[]>(`/procurements/${id}/errors`, { signal })
}
export function createProcurementError(id: string, text: string, isBlocking = true) {
  return authorizedJson<ProcurementError>(`/procurements/${id}/errors`, { method: 'POST', body: JSON.stringify({ text, isBlocking }) })
}
export function resolveProcurementError(id: string) {
  return authorizedJson<ProcurementError>(`/procurements/errors/${id}/resolve`, { method: 'POST' })
}
export function deleteProcurementError(id: string) {
  return authorizedJson<void>(`/procurements/errors/${id}`, { method: 'DELETE' })
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

export function uploadReceipt(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return authorizedUpload<ProcurementAttachment>(`/procurements/${id}/receipt`, form)
}

export function uploadWarehousePhotos(id: string, files: File[]) {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))
  return authorizedUpload<ProcurementAttachment[]>(
    `/procurements/${id}/warehouse-photos`,
    form,
  )
}

export function deleteAttachment(id: string, attachmentId: string) {
  return authorizedJson<void>(`/procurements/${id}/attachments/${attachmentId}`, {
    method: 'DELETE',
  })
}
