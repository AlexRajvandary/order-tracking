import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import type { OrderTimelineEvent, TimelineMarkerState } from './types'

type OrderTimelineProps = {
  events: OrderTimelineEvent[]
  emptyMessage?: string
  renderEvent: (event: OrderTimelineEvent, index: number) => ReactNode
  className?: string
}

export function OrderTimeline({
  events,
  emptyMessage,
  renderEvent,
  className,
}: OrderTimelineProps) {
  if (!events.length) {
    return emptyMessage ? (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    ) : null
  }

  return (
    <ol className={cn('relative space-y-0', className)}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1
        return (
          <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className="absolute top-7 bottom-0 left-[11px] w-px bg-border"
              />
            ) : null}
            <TimelineMarker state={event.markerState} />
            <div className="min-w-0 flex-1 pt-0.5">{renderEvent(event, index)}</div>
          </li>
        )
      })}
    </ol>
  )
}

function TimelineMarker({ state }: { state: TimelineMarkerState }) {
  return (
    <span
      className={cn(
        'relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-card',
        state === 'completed' && 'border-black bg-black text-white',
        state === 'current' && 'border-black bg-black text-white ring-4 ring-black/15',
        state === 'pending' && 'border-muted-foreground/30 bg-muted text-muted-foreground',
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  )
}
