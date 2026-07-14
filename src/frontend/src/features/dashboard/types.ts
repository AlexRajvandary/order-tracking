export type DashboardRecentOrder = {
  id: string
  trackingCode: string
  customerName: string | null
  createdAt: string
  updatedAt: string
}

export type DashboardRecentStatus = {
  orderId: string
  trackingCode: string
  itemName: string
  statusText: string
  comment: string | null
  changedAt: string
}

export type AuditFieldChange = {
  field: string
  oldValue: string | null
  newValue: string | null
}

export type DashboardAudit = {
  id: string
  entityType: string
  entityId: string
  action: string
  adminLogin: string | null
  createdAt: string
  canRestore: boolean
  changes: AuditFieldChange[]
}

export type AuditLogDetails = {
  id: string
  entityType: string
  entityId: string
  action: string
  adminUserId: string | null
  adminLogin: string | null
  oldValues: string | null
  newValues: string | null
  ipAddress: string | null
  userAgent: string | null
  correlationId: string | null
  createdAt: string
  canRestore: boolean
  changes: AuditFieldChange[]
}

export type DashboardSummary = {
  totalOrders: number
  totalCustomers: number
  ordersCreatedToday: number
  ordersUpdatedLast7Days: number
  statusChangesLast7Days: number
  recentOrders: DashboardRecentOrder[]
  recentStatusChanges: DashboardRecentStatus[]
  recentAudit: DashboardAudit[]
}
