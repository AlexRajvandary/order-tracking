import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import type { OrderTimelineEvent } from './types'

type OrderTimelineEventCardProps = {
  event: OrderTimelineEvent
  formattedDate?: string | null
  children?: ReactNode
  actions?: ReactNode
  className?: string
}

export function OrderTimelineEventCard({
  event,
  formattedDate,
  children,
  actions,
  className,
}: OrderTimelineEventCardProps) {
  const isCurrent = event.markerState === 'current'
  const isPending = event.markerState === 'pending'

  return (
    <div
      className={cn(
        'rounded-xl border bg-card px-3 py-2.5 text-sm transition-colors',
        isCurrent && 'border-primary/30 bg-primary/[0.03] ring-1 ring-primary/10',
        isPending && 'border-dashed opacity-70',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className={cn('font-semibold leading-snug', isPending && 'font-medium')}>
            {event.title}
          </p>
          {formattedDate ? (
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          ) : isPending ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : null}
        </div>
        {actions}
      </div>

      {event.description ? (
        <p className="mt-1.5 text-muted-foreground">{event.description}</p>
      ) : null}

      {event.authorName ? (
        <p className="mt-1 text-xs text-muted-foreground">{event.authorName}</p>
      ) : null}

      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  )
}
