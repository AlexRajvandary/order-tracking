export type Customer = {
  id: string
  lastName: string | null
  firstName: string | null
  patronymic: string | null
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

export type CustomerAddress = {
  id: string
  customerId: string | null
  city: string | null
  street: string | null
  building: string | null
  apartment: string | null
  postalCode: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
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
  lastName?: string | null
  firstName?: string | null
  patronymic?: string | null
  telegram?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
}
