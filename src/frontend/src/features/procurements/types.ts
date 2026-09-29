export type PurchaseStatus = 'Pending' | 'Purchased' | 'Error'
export type ArrivalStatus = 'Pending' | 'Received'
export type ShipmentStatus = 'AwaitingShipment' | 'Shipped'

export type ProcurementRow = {
  id: string
  orderId: string
  trackingCode: string
  orderItemId: string
  itemName: string
  productUrl: string | null
  purchaseUrl: string | null
  purchaseStatus: PurchaseStatus
  arrivalUrl: string | null
  arrivalStatus: ArrivalStatus
  shipmentUrl: string | null
  shipmentStatus: ShipmentStatus
  createdAt: string
  updatedAt: string
}

export type UpdateProcurementRequest = Pick<
  ProcurementRow,
  | 'purchaseUrl'
  | 'purchaseStatus'
  | 'arrivalUrl'
  | 'arrivalStatus'
  | 'shipmentUrl'
  | 'shipmentStatus'
>
