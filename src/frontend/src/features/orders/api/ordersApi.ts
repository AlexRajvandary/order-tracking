import { authorizedBlob, authorizedJson, authorizedUpload } from '@/shared/api/authorizedClient'
import type {
  AiOrderDraft,
  CreateOrderRequest,
  OrderDetails,
  OrderItem,
  OrderListItem,
  OrderStatus,
  PaginatedResponse,
  TrackingLink,
  UpdateOrderRequest,
  UpsertOrderItemRequest,
} from '../types'

export function getOrders(page = 1, pageSize = 20, signal?: AbortSignal) {
  return authorizedJson<PaginatedResponse<OrderListItem>>(
    `/orders?page=${page}&pageSize=${pageSize}`,
    { signal },
  )
}

export function searchOrders(params: {
  q?: string
  trackingCode?: string
  customerName?: string
  phone?: string
  page?: number
  pageSize?: number
}, signal?: AbortSignal) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.trackingCode) search.set('trackingCode', params.trackingCode)
  if (params.customerName) search.set('customerName', params.customerName)
  if (params.phone) search.set('phone', params.phone)
  search.set('page', String(params.page ?? 1))
  search.set('pageSize', String(params.pageSize ?? 20))
  return authorizedJson<PaginatedResponse<OrderListItem>>(`/orders/search?${search}`, { signal })
}

export function getOrder(id: string) {
  return authorizedJson<OrderDetails>(`/orders/${id}`)
}

export function createOrder(request: CreateOrderRequest) {
  return authorizedJson<OrderDetails>('/orders', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** AI parse → order draft for autofill. Does not create an order. */
export function parseOrderWithAi(input: { text?: string; image?: File }) {
  const form = new FormData()
  if (input.text?.trim()) {
    form.append('text', input.text.trim())
  }
  if (input.image) {
    form.append('image', input.image, input.image.name || 'screenshot.png')
  }
  return authorizedUpload<AiOrderDraft>('/orders/ai/parse', form)
}

export function updateOrder(id: string, request: UpdateOrderRequest) {
  return authorizedJson<OrderDetails>(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return authorizedJson<OrderDetails>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function deleteOrder(id: string) {
  return authorizedJson<void>(`/orders/${id}`, { method: 'DELETE' })
}

export function restoreOrder(id: string) {
  return authorizedJson<OrderDetails>(`/orders/${id}/restore`, { method: 'POST' })
}

export function getTrackingLink(id: string) {
  return authorizedJson<TrackingLink>(`/orders/${id}/tracking-link`)
}

export function getOrderQrBlob(id: string) {
  return authorizedBlob(`/orders/${id}/qr`)
}

export async function downloadOrderQr(id: string, trackingCode: string) {
  const blob = await getOrderQrBlob(id)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `order-${trackingCode}-qr.png`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function addOrderItem(orderId: string, request: UpsertOrderItemRequest) {
  return authorizedJson<OrderItem>(`/orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateOrderItem(
  orderId: string,
  itemId: string,
  request: UpsertOrderItemRequest,
) {
  return authorizedJson<OrderItem>(`/orders/${orderId}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export function deleteOrderItem(orderId: string, itemId: string) {
  return authorizedJson<void>(`/orders/${orderId}/items/${itemId}`, {
    method: 'DELETE',
  })
}
