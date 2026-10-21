export const TRACKING_STAGES = [
  'purchase',
  'originWarehouse',
  'transit',
  'moscow',
  'customerDelivery',
] as const

const PROCUREMENT_PROGRESS: Record<string, number> = {
  RequiredPurchase: 0,
  Purchased: 0,
  AwaitingWarehouse: 1,
  AtOriginWarehouse: 1,
  AwaitingTransitShipment: 2,
  SentToTransit: 2,
  ArrivedTransitCountry: 2,
  AwaitingMoscowShipment: 3,
  SentToMoscow: 3,
  ArrivedMoscow: 3,
  AwaitingCustomerShipment: 4,
  HandedToDelivery: 4,
  Delivered: 5,
}

export type TrackingStageItem = {
  id: string
  currentStatus: string | null
  procurementStatus: string | null
}

export type TrackingStageGroup<T extends TrackingStageItem> = {
  key: string
  stageIndex: number | null
  progress: number
  items: T[]
}

export function groupTrackingItemsByStage<T extends TrackingStageItem>(items: T[]) {
  const groups = new Map<string, TrackingStageGroup<T>>()

  for (const item of items) {
    const status = item.procurementStatus
    const knownStatus = status !== null && Object.prototype.hasOwnProperty.call(PROCUREMENT_PROGRESS, status)
    const progress = knownStatus ? PROCUREMENT_PROGRESS[status] : 0
    const stageIndex = knownStatus ? Math.min(progress, TRACKING_STAGES.length - 1) : null
    const key = stageIndex === null ? `unknown:${status ?? 'unknown'}` : `stage:${stageIndex}`
    const group = groups.get(key)

    if (group) {
      group.items.push(item)
    } else {
      groups.set(key, { key, stageIndex, progress, items: [item] })
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (a.stageIndex === null) return b.stageIndex === null ? 0 : 1
    if (b.stageIndex === null) return -1
    return a.stageIndex - b.stageIndex
  })
}
