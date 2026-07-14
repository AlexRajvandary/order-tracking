import { cn } from '@/shared/lib/utils'
import type { OrderStatus } from '@/features/orders/types'

export const orderStatusStyles: Record<
  OrderStatus,
  { dot: string; chip: string; chipSoft: string }
> = {
  AwaitingPayment: {
    dot: 'bg-neutral-500',
    chip: 'bg-neutral-500/15',
    chipSoft: 'bg-neutral-500/8',
  },
  InProgress: {
    dot: 'bg-blue-600',
    chip: 'bg-blue-600/15',
    chipSoft: 'bg-blue-600/8',
  },
  Completed: {
    dot: 'bg-emerald-600',
    chip: 'bg-emerald-600/15',
    chipSoft: 'bg-emerald-600/8',
  },
  Cancelled: {
    dot: 'bg-red-600',
    chip: 'bg-red-600/15',
    chipSoft: 'bg-red-600/8',
  },
}

type OrderStatusBadgeProps = {
  status: OrderStatus
  label: string
  className?: string
}

export function OrderStatusBadge({ status, label, className }: OrderStatusBadgeProps) {
  const styles = orderStatusStyles[status] ?? orderStatusStyles.AwaitingPayment

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground',
        styles.chip,
        className,
      )}
    >
      <span className={cn('size-2 shrink-0 rounded-full', styles.dot)} />
      {label}
    </span>
  )
}
