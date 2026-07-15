import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { StatusHistoryEntry } from '@/features/statuses/types'
import { buildItemTimelineEvents } from './buildOrderTimelineEvents'
import { OrderTimeline } from './OrderTimeline'
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
      <div className="text-sm">
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold leading-snug">{event.title}</p>
          {formattedDate ? (
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          ) : null}
        </div>

        {event.description ? (
          <p className="mt-1.5 text-muted-foreground">{event.description}</p>
        ) : null}

        {event.authorName ? (
          <p className="mt-1 text-xs text-muted-foreground">{event.authorName}</p>
        ) : null}

        {isItemStatusChangedEvent(event) ? (
          <div className="mt-2">
            <StatusHistoryAttachments
              orderId={orderId}
              historyId={event.meta.historyEntry.id}
              attachments={event.meta.historyEntry.attachments ?? []}
              onPhotosUploaded={onPhotosUploaded}
            />
          </div>
        ) : null}
      </div>
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
