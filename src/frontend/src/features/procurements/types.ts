export type PurchaseStatus = 'Pending' | 'Purchased' | 'Error'
export type ArrivalStatus = 'Pending' | 'InTransit' | 'Received'
export type ShipmentStatus = 'AwaitingShipment' | 'Shipped' | 'Delivered'
export type WarehouseCondition = 'Ok' | 'Good' | 'Damaged' | 'WrongItem' | 'Incomplete'
export type ProcurementAttachmentKind = 'Receipt' | 'WarehousePhoto'
export type ProcurementCurrencyCode = 'JPY' | 'RUB' | 'USD' | 'EUR'

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
  productImageUrl: string | null
  hasManualImage: boolean
  hasPreviewImage: boolean
  previewImageSource: string | null
  itemDescription: string | null
  shopName: string | null
  productSource: string
  unitPrice: number | null
  itemCurrencyCode: string | null
  sortOrder: number
  purchaseUrl: string | null
  purchaseStatus: PurchaseStatus
  purchasePrice: number | null
  purchaseCurrencyCode: ProcurementCurrencyCode
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
  shippingCurrencyCode: ProcurementCurrencyCode
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
  | 'purchaseCurrencyCode'
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
  | 'shippingCurrencyCode'
  | 'shippedAt'
>
