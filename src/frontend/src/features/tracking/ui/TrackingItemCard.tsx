import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { PublicStatusAttachment, PublicTrackingItem } from '@/features/tracking/api/trackingApi'
import { attachmentUrl } from '@/features/tracking/api/trackingApi'
import {
  OrderTimeline,
  OrderTimelineEventCard,
  type OrderTimelineEvent,
} from '@/features/orders/ui/order-timeline'
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTrigger,
} from '@/shared/ui/attachment'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

const STATUS_DOT_GREEN = '#22C55E'

const photoAttachmentClassName =
  'w-24 gap-0 overflow-hidden p-0 has-data-[slot=attachment-media]:p-0'

const photoMediaClassName =
  'aspect-square w-full rounded-none opacity-100 group-data-[size=sm]/attachment:w-full'

function formatTimelineDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function StatusDot({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: STATUS_DOT_GREEN }}
    />
  )
}

function PublicTimelinePhotos({ attachments }: { attachments: PublicStatusAttachment[] }) {
  const { t } = useTranslation('tracking')

  if (!attachments.length) return null

  return (
    <AttachmentGroup>
      {attachments.map((photo) => (
        <Attachment
          key={photo.id}
          state="done"
          orientation="vertical"
          size="sm"
          className={photoAttachmentClassName}
        >
          <AttachmentMedia variant="image" className={photoMediaClassName}>
            <img src={attachmentUrl(photo.url)} alt="" className="size-full object-cover" />
          </AttachmentMedia>
          <AttachmentTrigger asChild>
            <a
              href={attachmentUrl(photo.url)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('openPhoto')}
            />
          </AttachmentTrigger>
        </Attachment>
      ))}
    </AttachmentGroup>
  )
}

function PublicItemStatusTimeline({
  item,
  locale,
}: {
  item: PublicTrackingItem
  locale: string
}) {
  const { t } = useTranslation('tracking')

  const events = useMemo(() => {
    const sorted = [...item.history].sort(
      (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
    )

    return sorted.map((entry, index): OrderTimelineEvent => ({
      id: `${entry.changedAt}-${index}`,
      type: 'item.status_changed',
      occurredAt: entry.changedAt,
      title: entry.status,
      description: entry.comment?.trim() || null,
      markerState: index === 0 ? 'current' : 'completed',
      markerColor: index === 0 ? item.statusColor : null,
      meta: { attachments: entry.attachments ?? [] },
    }))
  }, [item.history, item.statusColor])

  return (
    <OrderTimeline
      events={events}
      emptyMessage={t('historyEmpty')}
      renderEvent={(event) => {
        const attachments =
          (event.meta?.attachments as PublicStatusAttachment[] | undefined) ?? []

        return (
          <OrderTimelineEventCard
            event={event}
            formattedDate={
              event.occurredAt ? formatTimelineDate(event.occurredAt, locale) : null
            }
          >
            <PublicTimelinePhotos attachments={attachments} />
          </OrderTimelineEventCard>
        )
      }}
    />
  )
}

export function TrackingItemCard({
  item,
  locale,
}: {
  item: PublicTrackingItem
  locale: string
}) {
  const { t } = useTranslation('tracking')
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{item.name}</h3>
            {item.type === 'Product' ? (
              <p className="text-xs text-muted-foreground">
                {t('quantity')}: {item.quantity}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StatusDot />
            <Badge variant="secondary">{item.currentStatus ?? t('noStatus')}</Badge>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-base font-medium text-foreground transition-opacity hover:opacity-70"
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <ChevronDown
              className={cn('size-4 transition-transform', historyOpen && 'rotate-180')}
            />
            {t('history')}
            {item.history.length > 0 ? (
              <span className="tabular-nums">({item.history.length})</span>
            ) : null}
          </button>

          {historyOpen ? (
            <div className="mt-3">
              <PublicItemStatusTimeline item={item} locale={locale} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export { StatusDot }
