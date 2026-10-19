import type { ProcurementStatus } from '@/features/procurements/types'

const nextActionStatus: Partial<Record<ProcurementStatus, ProcurementStatus>> = {
  RequiredPurchase: 'Purchased',
  Purchased: 'AtOriginWarehouse',
  AwaitingWarehouse: 'AtOriginWarehouse',
  AtOriginWarehouse: 'SentToTransit',
  AwaitingTransitShipment: 'SentToTransit',
  SentToTransit: 'ArrivedTransitCountry',
  ArrivedTransitCountry: 'SentToMoscow',
  AwaitingMoscowShipment: 'SentToMoscow',
  SentToMoscow: 'ArrivedMoscow',
  ArrivedMoscow: 'HandedToDelivery',
  AwaitingCustomerShipment: 'HandedToDelivery',
  HandedToDelivery: 'Delivered',
}

export function getNextProcurementActionStatus(status: ProcurementStatus) {
  return nextActionStatus[status] ?? null
}
