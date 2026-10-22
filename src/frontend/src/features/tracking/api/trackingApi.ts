import { apiFetch } from '@/shared/api/client'
import { API_BASE_URL } from '@/shared/api/config'
import type { OrderStatus } from '@/features/orders/types'

export type PublicStatusAttachment = {
  id: string
  url: string
  contentType: string
  uploadedByAdminName: string | null
  uploadedAt: string
}

export type PublicStatusHistory = {
  status: string
  comment: string | null
  country: string | null
  location: string | null
  changedAt: string
  attachments: PublicStatusAttachment[]
}

export type PublicTrackingItem = {
  id: string
  name: string
  quantity: number
  imageUrl: string | null
  currentStatus: string | null
  statusColor: string | null
  procurementStatus: string | null
  history: PublicStatusHistory[]
}

export type PublicTrackingOrder = {
  trackingCode: string
  createdAt: string
  expectedDeliveryAt: string | null
  status: OrderStatus
  items: PublicTrackingItem[]
}

export function getPublicOrder(trackingCode: string) {
  return apiFetch<PublicTrackingOrder>(`/track/${encodeURIComponent(trackingCode)}`)
}

export function attachmentUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const apiBase = API_BASE_URL.replace(/\/+$/, '')
  const apiBaseUrl = /^https?:\/\//i.test(apiBase) ? new URL(apiBase) : null
  const apiBasePath = apiBaseUrl?.pathname.replace(/\/+$/, '') || apiBase
  const alreadyIncludesApiBase = apiBasePath
    && (normalizedPath === apiBasePath || normalizedPath.startsWith(`${apiBasePath}/`))

  if (alreadyIncludesApiBase) {
    return apiBaseUrl ? `${apiBaseUrl.origin}${normalizedPath}` : normalizedPath
  }

  return `${apiBase}${normalizedPath}`
}
