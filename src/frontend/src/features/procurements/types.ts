export type ProcurementStatus = 'RequiredPurchase' | 'Purchased' | 'AwaitingWarehouse' | 'AtOriginWarehouse' | 'AwaitingTransitShipment' | 'SentToTransit' | 'ArrivedTransitCountry' | 'AwaitingMoscowShipment' | 'SentToMoscow' | 'ArrivedMoscow' | 'AwaitingCustomerShipment' | 'HandedToDelivery' | 'Delivered'
export type ProcurementStage = 'purchase' | 'originWarehouse' | 'transit' | 'moscow' | 'customerDelivery' | 'archive'
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
  status: ProcurementStatus
  stage: ProcurementStage
  nextStatus: ProcurementStatus | null
  previousStatus: ProcurementStatus | null
  nextStage: ProcurementStage | null
  previousStage: ProcurementStage | null
  openErrorCount: number
  purchasePrice: number | null
  purchaseCurrencyCode: ProcurementCurrencyCode
  sellerOrderNumber: string | null
  warehouseTrackingNumber: string | null
  warehouseReceivedAt: string | null
  warehouseCondition: WarehouseCondition | null
  shippingTrackingNumber: string | null
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
  | 'purchasePrice'
  | 'purchaseCurrencyCode'
  | 'sellerOrderNumber'
  | 'warehouseTrackingNumber'
  | 'warehouseReceivedAt'
  | 'warehouseCondition'
  | 'shippingTrackingNumber'
  | 'shippingMethod'
  | 'shippingWeight'
  | 'shippingCost'
  | 'shippingCurrencyCode'
  | 'shippedAt'
>
