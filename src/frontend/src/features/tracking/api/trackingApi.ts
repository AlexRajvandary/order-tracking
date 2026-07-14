import { apiFetch } from '@/shared/api/client'
import { API_BASE_URL } from '@/shared/api/config'

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
  changedAt: string
  attachments: PublicStatusAttachment[]
}

export type PublicTrackingItem = {
  name: string
  type: string
  quantity: number
  currentStatus: string | null
  statusColor: string | null
  history: PublicStatusHistory[]
}

export type PublicTrackingOrder = {
  trackingCode: string
  createdAt: string
  lastUpdatedAt: string
  customerName: string | null
  customerEmail: string | null
  customerTelegram: string | null
  overallIsFinal: boolean
  items: PublicTrackingItem[]
}

export function getPublicOrder(trackingCode: string) {
  return apiFetch<PublicTrackingOrder>(`/track/${encodeURIComponent(trackingCode)}`)
}

export function attachmentUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
