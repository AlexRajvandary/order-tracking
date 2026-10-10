import { authorizedJson } from '@/shared/api/authorizedClient'

export type SalesOrderListItem = {
  id: string
  trackingCode: string
  requestTrackingCode: string
  customerName: string | null
  customerPhone: string | null
  status: string
  itemsCount: number
  createdAt: string
  updatedAt: string
}

export type SalesOrderDetails = {
  id: string
  sourceRequestId: string
  workspaceRequestId: string
  requestTrackingCode: string
  trackingCode: string
  status: string
  createdAt: string
  updatedAt: string
}

export function getSalesOrders(signal?: AbortSignal) {
  return authorizedJson<SalesOrderListItem[]>('/sales-orders', { signal })
}

export function getSalesOrder(id: string, signal?: AbortSignal) {
  return authorizedJson<SalesOrderDetails>(`/sales-orders/${id}`, { signal })
}

export function convertRequest(requestId: string) {
  return authorizedJson<SalesOrderDetails>(`/sales-orders/from-request/${requestId}`, { method: 'POST' })
}

export function sendToProcurement(id: string) {
  return authorizedJson<void>(`/sales-orders/${id}/send-to-procurement`, { method: 'POST' })
}

export function deleteSalesOrder(id: string) {
  return authorizedJson<void>(`/sales-orders/${id}`, { method: 'DELETE' })
}
