export type OrderStatus =
  | 'AwaitingPayment'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'

export type CurrencyCode = 'RUB' | 'USD' | 'EUR' | 'GBP' | 'JPY'

export type OrderListItem = {
  id: string
  trackingCode: string
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  customerTelegram: string | null
  adminNotes: string | null
  status: OrderStatus
  itemsCount: number
  createdAt: string
  updatedAt: string
}

export type OrderItem = {
  id: string
  itemType: string
  name: string
  description: string | null
  quantity: number
  unitPrice: number | null
  currencyCode: CurrencyCode | null
  sortOrder: number
  currentStatusId: string | null
  currentStatusText: string | null
  currentStatusUpdatedAt: string | null
}

export type OrderDetails = {
  id: string
  trackingCode: string
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  customerTelegram: string | null
  customerEmail: string | null
  adminNotes: string | null
  createdByAdminId: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  expectedDeliveryAt: string | null
  deliveryAddressId: string | null
  deliveryCity: string | null
  deliveryStreet: string | null
  deliveryBuilding: string | null
  deliveryApartment: string | null
  deliveryPostalCode: string | null
  deliveryNote: string | null
  items: OrderItem[]
}

export type CreateOrderItemInput = {
  itemType: 'Product' | 'Service'
  name: string
  description?: string | null
  quantity?: number
  unitPrice?: number | null
  currencyCode?: CurrencyCode | null
}

export type UpsertOrderItemRequest = {
  itemType: 'Product' | 'Service'
  name: string
  description?: string | null
  quantity?: number
  unitPrice?: number | null
  currencyCode?: CurrencyCode | null
}

export type CreateOrderNewCustomer = {
  lastName?: string | null
  firstName?: string | null
  patronymic?: string | null
  telegram?: string | null
  phone?: string | null
  email?: string | null
}

export type CreateOrderDeliveryAddress = {
  city?: string | null
  street?: string | null
  building?: string | null
  apartment?: string | null
  postalCode?: string | null
  note?: string | null
}

export type CreateOrderRequest = {
  customerId?: string | null
  newCustomer?: CreateOrderNewCustomer | null
  adminNotes?: string | null
  deliveryAddressId?: string | null
  deliveryAddress?: CreateOrderDeliveryAddress | null
  items?: CreateOrderItemInput[]
}

export type UpdateOrderRequest = {
  customerId?: string | null
  adminNotes?: string | null
  expectedDeliveryAt?: string | null
}

export type UpdateOrderStatusRequest = {
  status: OrderStatus
}

export type TrackingLink = {
  trackingCode: string
  trackingUrl: string
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
