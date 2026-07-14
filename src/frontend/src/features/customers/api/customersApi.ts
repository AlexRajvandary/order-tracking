import { authorizedJson } from '@/shared/api/authorizedClient'
import type {
  Customer,
  CustomerOrderSummary,
  PaginatedResponse,
  UpsertCustomerRequest,
} from '../types'

export function getCustomers(page = 1, pageSize = 20) {
  return authorizedJson<PaginatedResponse<Customer>>(
    `/customers?page=${page}&pageSize=${pageSize}`,
  )
}

export function searchCustomers(params: {
  q?: string
  phone?: string
  page?: number
  pageSize?: number
}) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.phone) search.set('phone', params.phone)
  search.set('page', String(params.page ?? 1))
  search.set('pageSize', String(params.pageSize ?? 20))
  return authorizedJson<PaginatedResponse<Customer>>(`/customers/search?${search}`)
}

export function getCustomer(id: string) {
  return authorizedJson<Customer>(`/customers/${id}`)
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

export function getCustomerOrders(id: string, page = 1, pageSize = 20) {
  return authorizedJson<PaginatedResponse<CustomerOrderSummary>>(
    `/customers/${id}/orders?page=${page}&pageSize=${pageSize}`,
  )
}
