import { endOfDay, format, parseISO, startOfDay } from 'date-fns'

export type CreatedAtDateRange = {
  from?: Date
  to?: Date
}

export type CreatedAtPosition = {
  createdAt: string
  orderId: string
}

export function isCreatedAtInDateRange(createdAt: string, range: CreatedAtDateRange | undefined): boolean {
  if (!range?.from && !range?.to) return true

  const firstDate = range.from ?? range.to!
  const lastDate = range.to ?? range.from!
  const start = startOfDay(firstDate <= lastDate ? firstDate : lastDate)
  const end = endOfDay(firstDate <= lastDate ? lastDate : firstDate)
  const created = parseISO(createdAt)

  return !Number.isNaN(created.getTime()) && created >= start && created <= end
}

export function filterByCreatedAt<T extends CreatedAtPosition>(
  rows: readonly T[],
  range: CreatedAtDateRange | undefined,
): T[] {
  if (!range?.from && !range?.to) return [...rows]
  return rows.filter((row) => isCreatedAtInDateRange(row.createdAt, range))
}

export function countProductsAndDistinctOrders(rows: readonly Pick<CreatedAtPosition, 'orderId'>[]) {
  return {
    products: rows.length,
    orders: new Set(rows.map((row) => row.orderId)).size,
  }
}

export function countOrdersByCreatedDate(rows: readonly CreatedAtPosition[]): Map<string, number> {
  const ordersByDate = new Map<string, Set<string>>()

  rows.forEach((row) => {
    const created = parseISO(row.createdAt)
    if (Number.isNaN(created.getTime())) return

    const dateKey = format(created, 'yyyy-MM-dd')
    const orders = ordersByDate.get(dateKey) ?? new Set<string>()
    orders.add(row.orderId)
    ordersByDate.set(dateKey, orders)
  })

  return new Map(Array.from(ordersByDate, ([date, orders]) => [date, orders.size]))
}
