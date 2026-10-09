import { authorizedJson } from '@/shared/api/authorizedClient'
import type {
  Customer,
  CustomerAddress,
  CustomerOrderSummary,
  PaginatedResponse,
  UpsertCustomerRequest,
} from '../types'

export function getCustomers(page = 1, pageSize = 20, signal?: AbortSignal) {
  return authorizedJson<PaginatedResponse<Customer>>(
    `/customers?page=${page}&pageSize=${pageSize}`,
    { signal },
  )
}

export function searchCustomers(params: {
  q?: string
  phone?: string
  page?: number
  pageSize?: number
}, signal?: AbortSignal) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.phone) search.set('phone', params.phone)
  search.set('page', String(params.page ?? 1))
  search.set('pageSize', String(params.pageSize ?? 20))
  return authorizedJson<PaginatedResponse<Customer>>(`/customers/search?${search}`, { signal })
}

export function getCustomer(id: string) {
  return authorizedJson<Customer>(`/customers/${id}`)
}

export type CustomerAccountNotificationSettings = { telegramLinked: boolean; enabledByCustomer: boolean; disabledByAdmin: boolean }

export function getCustomerAccountNotificationSettings(id: string) {
  return authorizedJson<CustomerAccountNotificationSettings>(`/customers/${id}/account-notifications`)
}

export function setCustomerAccountNotificationsDisabled(id: string, disabledByAdmin: boolean) {
  return authorizedJson<CustomerAccountNotificationSettings>(`/customers/${id}/account-notifications`, {
    method: 'PUT',
    body: JSON.stringify({ disabledByAdmin }),
  })
}

export function createCustomer(request: UpsertCustomerRequest) {
  return authorizedJson<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateCustomer(id: string, request: UpsertCustomerRequest) {
  return authorizedJson<Customer>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export function deleteCustomer(id: string) {
  return authorizedJson<void>(`/customers/${id}`, { method: 'DELETE' })
}

export function getCustomerOrders(id: string, page = 1, pageSize = 20) {
  return authorizedJson<PaginatedResponse<CustomerOrderSummary>>(
    `/customers/${id}/orders?page=${page}&pageSize=${pageSize}`,
  )
}

export function getCustomerAddresses(id: string, signal?: AbortSignal) {
  return authorizedJson<CustomerAddress[]>(`/customers/${id}/addresses`, { signal })
}

export function getUnassignedAddresses(signal?: AbortSignal) {
  return authorizedJson<CustomerAddress[]>('/customers/addresses', { signal })
}
