import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as statusesApi from '@/features/statuses/api/statusesApi'
import type {
  StatusHistoryEntry,
  UpdateOrderItemStatusHistoryRequest,
} from '@/features/statuses/types'
import { CountrySelect, formatCountryDisplay } from '@/features/statuses/ui/CountrySelect'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { DateTimePicker, STATUS_HISTORY_DAY_PRESETS } from '@/shared/ui/date-picker'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { buildItemTimelineEvents } from './buildOrderTimelineEvents'
import { OrderTimeline } from './OrderTimeline'
import { StatusHistoryAttachments } from './StatusHistoryAttachments'
import { isItemStatusChangedEvent, type OrderTimelineEvent } from './types'

type ItemStatusTimelineProps = {
  orderId: string
  orderCreatedAt: string
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
  orderCreatedAt,
  history,
  onPhotosUploaded,
}: ItemStatusTimelineProps) {
  const { t } = useTranslation('statuses')
  const { t: tOrders } = useTranslation('orders')
  const { i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<StatusHistoryEntry | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const events = useMemo(
    () =>
      buildItemTimelineEvents(history, {
        statusTitle: (entry) => entry.statusText,
        statusDescription: (entry) => {
          const parts = [
            formatCountryDisplay(entry.country, i18n.language),
            entry.location?.trim(),
            entry.comment?.trim(),
          ].filter(Boolean)
          return parts.length ? parts.join(' · ') : null
        },
      }),
    [history, i18n.language],
  )

  const editMutation = useMutation({
    mutationFn: ({
      historyId,
      request,
    }: {
      historyId: string
      request: UpdateOrderItemStatusHistoryRequest
    }) => statusesApi.updateOrderItemStatusHistory(orderId, historyId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order-status-history', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      setEditing(null)
      setEditError(null)
      onPhotosUploaded()
    },
    onError: (err: unknown) => {
      setEditError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (historyId: string) =>
      statusesApi.cancelScheduledStatusHistory(orderId, historyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order-status-history', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      onPhotosUploaded()
    },
  })

  function renderEvent(event: OrderTimelineEvent) {
    const formattedDate = event.occurredAt
      ? formatTimelineDate(event.occurredAt, i18n.language)
      : null
    const entry = isItemStatusChangedEvent(event) ? event.meta.historyEntry : null
    const scheduled = entry && !entry.isPublished

    return (
      <div className="text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold leading-snug">{event.title}</p>
              {scheduled ? <Badge variant="outline">{t('scheduled')}</Badge> : null}
            </div>
            {formattedDate ? (
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            ) : null}
          </div>
          {entry ? (
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('edit')}
                onClick={() => {
                  setEditError(null)
                  setEditing(entry)
                }}
              >
                <Pencil />
              </Button>
              {scheduled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('cancelPublish')}
                  onClick={() => {
                    if (window.confirm(t('cancelPublishConfirm'))) {
                      cancelMutation.mutate(entry.id)
                    }
                  }}
                >
                  <X />
                </Button>
              ) : null}
            </div>
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
    <>
      <OrderTimeline
        events={events}
        emptyMessage={tOrders('timeline.empty')}
        renderEvent={renderEvent}
      />

      {editing ? (
        <EditStatusHistoryDialog
          open
          entry={editing}
          orderCreatedAt={orderCreatedAt}
          error={editError}
          submitting={editMutation.isPending}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null)
              setEditError(null)
            }
          }}
          onSubmit={(request) =>
            editMutation.mutate({ historyId: editing.id, request })
          }
        />
      ) : null}
    </>
  )
}

function EditStatusHistoryDialog({
  open,
  entry,
  orderCreatedAt,
  error,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  entry: StatusHistoryEntry
  orderCreatedAt: string
  error: string | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (request: UpdateOrderItemStatusHistoryRequest) => void
}) {
  const { t } = useTranslation('statuses')
  const [statusText, setStatusText] = useState(entry.statusText)
  const [comment, setComment] = useState(entry.comment ?? '')
  const [country, setCountry] = useState(entry.country ?? '')
  const [location, setLocation] = useState(entry.location ?? '')
  const [publishAt, setPublishAt] = useState<string | null>(
    entry.publishAt ?? entry.changedAt ?? null,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('update.editTitle')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({
              statusText: statusText.trim(),
              comment: comment.trim() || null,
              country: country.trim() || null,
              location: location.trim() || null,
              publishAt,
            })
          }}
        >
          <div className="space-y-1.5">
            <Label>{t('form.name')}</Label>
            <Input
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('update.comment')}</Label>
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('update.commentPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('update.country')}</Label>
            <CountrySelect value={country} onValueChange={setCountry} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('update.location')}</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('update.locationPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('update.publishAt')}</Label>
            <DateTimePicker
              value={publishAt}
              onChange={setPublishAt}
              orderCreatedAt={orderCreatedAt}
              dayPresets={STATUS_HISTORY_DAY_PRESETS}
              align="start"
              className="h-9 w-full justify-start"
            />
            <p className="text-xs text-muted-foreground">{t('update.publishAtHint')}</p>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t('save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
