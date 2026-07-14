import type { StatusHistoryEntry } from '@/features/statuses/types'
import type { OrderTimelineEvent } from './types'

type BuildLabels = {
  statusTitle: (entry: StatusHistoryEntry) => string
  statusDescription: (entry: StatusHistoryEntry) => string | null
}

/** Build item activity events, newest first. Extensible via event `type`. */
export function buildItemTimelineEvents(
  history: StatusHistoryEntry[],
  labels: BuildLabels,
): OrderTimelineEvent[] {
  const sortedNewestFirst = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  )

  return sortedNewestFirst.map((entry, index) => ({
    id: entry.id,
    type: 'item.status_changed',
    occurredAt: entry.changedAt,
    title: labels.statusTitle(entry),
    description: labels.statusDescription(entry),
    authorName: entry.changedByAdminName,
    markerState: index === 0 ? 'current' : 'completed',
    markerColor: entry.statusColor,
    meta: { historyEntry: entry },
  }))
}
