import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { StatusHistoryEntry } from '@/features/statuses/types'
import { buildItemTimelineEvents } from './buildOrderTimelineEvents'
import { OrderTimeline } from './OrderTimeline'
import { OrderTimelineEventCard } from './OrderTimelineEventCard'
import { StatusHistoryAttachments } from './StatusHistoryAttachments'
import { isItemStatusChangedEvent, type OrderTimelineEvent } from './types'

type ItemStatusTimelineProps = {
  orderId: string
  history: StatusHistoryEntry[]
  onPhotosUploaded: () => void
}

function formatTimelineDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ItemStatusTimeline({
  orderId,
  history,
  onPhotosUploaded,
}: ItemStatusTimelineProps) {
  const { t } = useTranslation('orders')
  const { i18n } = useTranslation()

  const events = useMemo(
    () =>
      buildItemTimelineEvents(history, {
        statusTitle: (entry) => entry.statusText,
        statusDescription: (entry) => entry.comment?.trim() || null,
      }),
    [history],
  )

  function renderEvent(event: OrderTimelineEvent) {
    const formattedDate = event.occurredAt
      ? formatTimelineDate(event.occurredAt, i18n.language)
      : null

    return (
      <OrderTimelineEventCard event={event} formattedDate={formattedDate}>
        {isItemStatusChangedEvent(event) ? (
          <StatusHistoryAttachments
            orderId={orderId}
            historyId={event.meta.historyEntry.id}
            attachments={event.meta.historyEntry.attachments ?? []}
            onPhotosUploaded={onPhotosUploaded}
          />
        ) : null}
      </OrderTimelineEventCard>
    )
  }

  return (
    <OrderTimeline
      events={events}
      emptyMessage={t('timeline.empty')}
      renderEvent={renderEvent}
    />
  )
}
