export type PurchaseStatus = 'Pending' | 'Purchased' | 'Error'
export type ArrivalStatus = 'Pending' | 'Received'
export type ShipmentStatus = 'AwaitingShipment' | 'Shipped'
export type WarehouseCondition = 'Ok' | 'Damaged' | 'WrongItem' | 'Incomplete'
export type ProcurementAttachmentKind = 'Receipt' | 'WarehousePhoto'

export type ProcurementAttachment = {
  id: string
  kind: ProcurementAttachmentKind
  fileName: string | null
  contentType: string
  sizeBytes: number
  url: string
}

export type ProcurementRow = {
  id: string
  orderId: string
  trackingCode: string
  orderItemId: string
  itemName: string
  productUrl: string | null
  purchaseUrl: string | null
  purchaseStatus: PurchaseStatus
  purchasePrice: number | null
  sellerOrderNumber: string | null
  warehouseTrackingNumber: string | null
  arrivalStatus: ArrivalStatus
  warehouseReceivedAt: string | null
  warehouseCondition: WarehouseCondition | null
  shippingTrackingNumber: string | null
  shipmentStatus: ShipmentStatus
  shippingMethod: string | null
  shippingWeight: number | null
  shippingCost: number | null
  shippedAt: string | null
  attachments: ProcurementAttachment[]
  createdAt: string
  updatedAt: string
}

export type UpdateProcurementRequest = Pick<
  ProcurementRow,
  | 'purchaseUrl'
  | 'purchaseStatus'
  | 'purchasePrice'
  | 'sellerOrderNumber'
  | 'warehouseTrackingNumber'
  | 'arrivalStatus'
  | 'warehouseReceivedAt'
  | 'warehouseCondition'
  | 'shippingTrackingNumber'
  | 'shipmentStatus'
  | 'shippingMethod'
  | 'shippingWeight'
  | 'shippingCost'
  | 'shippedAt'
>
