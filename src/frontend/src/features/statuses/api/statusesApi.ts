import { authorizedFetch, authorizedJson, authorizedUpload } from '@/shared/api/authorizedClient'
import { ApiError } from '@/shared/api/client'
import type {
  StatusDefinition,
  StatusHistoryAttachment,
  StatusHistoryEntry,
  UpdateOrderItemStatusRequest,
  UpdateStatusRequest,
  UpsertStatusRequest,
} from '../types'

export function getStatuses(params?: { itemType?: string; includeInactive?: boolean }) {
  const search = new URLSearchParams()
  if (params?.itemType) search.set('itemType', params.itemType)
  if (params?.includeInactive) search.set('includeInactive', 'true')
  const qs = search.toString()
  return authorizedJson<StatusDefinition[]>(`/statuses${qs ? `?${qs}` : ''}`)
}

export function createStatus(request: UpsertStatusRequest) {
  return authorizedJson<StatusDefinition>('/statuses', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateStatus(id: string, request: UpdateStatusRequest) {
  return authorizedJson<StatusDefinition>(`/statuses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export function deactivateStatus(id: string) {
  return authorizedJson<void>(`/statuses/${id}`, { method: 'DELETE' })
}

export async function updateOrderItemStatus(
  orderId: string,
  itemId: string,
  request: UpdateOrderItemStatusRequest,
) {
  const form = new FormData()
  if (request.statusDefinitionId) {
    form.append('statusDefinitionId', request.statusDefinitionId)
  }
  if (request.customStatusText) {
    form.append('customStatusText', request.customStatusText)
  }
  if (request.comment) {
    form.append('comment', request.comment)
  }
  for (const photo of request.photos ?? []) {
    form.append('photos', photo)
  }

  const response = await authorizedFetch(`/orders/${orderId}/items/${itemId}/status`, {
    method: 'PATCH',
    body: form,
    headers: {},
  })

  if (!response.ok) {
    let detail: string | undefined
    try {
      const problem = (await response.json()) as { detail?: string; title?: string }
      detail = problem.detail ?? problem.title
    } catch {
      detail = response.statusText
    }
    throw new ApiError(detail ?? 'Request failed', response.status, detail)
  }

  return response.json()
}

export function getOrderStatusHistory(orderId: string) {
  return authorizedJson<StatusHistoryEntry[]>(`/orders/${orderId}/status-history`)
}

export function addStatusHistoryPhoto(
  orderId: string,
  historyId: string,
  photo: File,
  onProgress?: (percent: number) => void,
) {
  const form = new FormData()
  form.append('photos', photo)

  return authorizedUpload<StatusHistoryAttachment[]>(
    `/orders/${orderId}/status-history/${historyId}/photos`,
    form,
    onProgress,
  )
}

export async function addStatusHistoryPhotos(
  orderId: string,
  historyId: string,
  photos: File[],
  onProgress?: (fileIndex: number, percent: number) => void,
) {
  const results: StatusHistoryAttachment[] = []
  for (let i = 0; i < photos.length; i += 1) {
    const uploaded = await addStatusHistoryPhoto(orderId, historyId, photos[i], (percent) =>
      onProgress?.(i, percent),
    )
    results.push(...uploaded)
  }
  return results
}

export function deleteStatusHistoryPhoto(
  orderId: string,
  historyId: string,
  attachmentId: string,
) {
  return authorizedJson<void>(
    `/orders/${orderId}/status-history/${historyId}/photos/${attachmentId}`,
    { method: 'DELETE' },
  )
}
