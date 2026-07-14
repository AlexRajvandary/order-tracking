export type Customer = {
  id: string
  fullName: string | null
  telegram: string | null
  phone: string | null
  email: string | null
  notes: string | null
  createdAt: string
  ordersCount: number
}

export type CustomerOrderSummary = {
  id: string
  trackingCode: string
  createdAt: string
  updatedAt: string
}

export type PaginatedResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type UpsertCustomerRequest = {
  fullName?: string | null
  telegram?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
}
