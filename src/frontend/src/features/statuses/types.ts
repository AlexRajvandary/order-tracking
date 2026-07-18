export type StatusDefinition = {
  id: string
  name: string
  itemType: string | null
  color: string | null
  defaultCountry: string | null
  defaultLocation: string | null
  publishAfterDays: number | null
  sortOrder: number
  isActive: boolean
  isFinal: boolean
  createdAt: string
}

export type StatusHistoryAttachment = {
  id: string
  url: string
  contentType: string
  uploadedByAdminId: string
  uploadedByAdminName: string | null
  uploadedAt: string
}

export type StatusHistoryEntry = {
  id: string
  orderItemId: string
  orderItemName: string
  orderItemType: string
  statusDefinitionId: string | null
  statusText: string
  statusColor: string | null
  comment: string | null
  country: string | null
  location: string | null
  publishAt: string | null
  isPublished: boolean
  changedByAdminId: string
  changedByAdminName: string | null
  changedAt: string
  attachments: StatusHistoryAttachment[]
}

export type UpsertStatusRequest = {
  name: string
  itemType?: 'Product' | 'Service' | null
  color?: string | null
  defaultCountry?: string | null
  defaultLocation?: string | null
  publishAfterDays?: number | null
  sortOrder?: number
  isFinal?: boolean
}

export type UpdateStatusRequest = UpsertStatusRequest & {
  isActive: boolean
  isFinal: boolean
}

export type UpdateOrderItemStatusRequest = {
  statusDefinitionId?: string | null
  customStatusText?: string | null
  comment?: string | null
  country?: string | null
  location?: string | null
  publishAt?: string | null
  photos?: File[]
}

export type UpdateOrderItemStatusHistoryRequest = {
  statusText?: string | null
  comment?: string | null
  country?: string | null
  location?: string | null
  publishAt?: string | null
}
