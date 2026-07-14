import type { StatusHistoryEntry } from '@/features/statuses/types'
import type { OrderStatus } from '@/features/orders/types'

/** Extensible event catalogue — append new types as the product grows. */
export type OrderTimelineEventType =
  | 'order.created'
  | 'order.status'
  | 'item.status_changed'
  | 'shipment.created'
  | 'payment.received'
  | 'package.scanned'
  | 'delivery.attempt'
  | 'customer.comment'
  | 'photo.uploaded'

export type TimelineMarkerState = 'completed' | 'current' | 'pending'

export type OrderTimelineEventBase = {
  id: string
  type: OrderTimelineEventType
  occurredAt: string | null
  title: string
  description?: string | null
  authorName?: string | null
  markerState: TimelineMarkerState
  markerColor?: string | null
  meta?: Record<string, unknown>
}

export type ItemStatusChangedEvent = OrderTimelineEventBase & {
  type: 'item.status_changed'
  meta: {
    historyEntry: StatusHistoryEntry
  }
}

export type OrderStatusPipelineEvent = OrderTimelineEventBase & {
  type: 'order.status'
  meta: {
    status: OrderStatus
  }
}

export type OrderCreatedEvent = OrderTimelineEventBase & {
  type: 'order.created'
}

export type OrderTimelineEvent =
  | OrderCreatedEvent
  | OrderStatusPipelineEvent
  | ItemStatusChangedEvent
  | OrderTimelineEventBase

export function isItemStatusChangedEvent(
  event: OrderTimelineEvent,
): event is ItemStatusChangedEvent {
  return event.type === 'item.status_changed'
}
