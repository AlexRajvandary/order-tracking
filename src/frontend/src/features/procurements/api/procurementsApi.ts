import { authorizedJson, authorizedUpload } from '@/shared/api/authorizedClient'
import type { ProcurementAttachment, ProcurementRow, UpdateProcurementRequest } from '../types'

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
