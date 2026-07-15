import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import * as ordersApi from '@/features/orders/api/ordersApi'
import type { OrderListItem, OrderStatus } from '@/features/orders/types'
import { orderStatusStyles } from '@/features/orders/ui/OrderStatusBadge'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { DataTable, DataTableColumnHeader, dateRangeFilterFn } from '@/shared/ui/data-table'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { formatTelegram, telegramHref } from '@/shared/lib/telegram'
import { SearchInput } from '@/shared/ui/search-input'
import { cn } from '@/shared/lib/utils'

const orderStatusBadgeClass: Record<OrderStatus, string> = {
  AwaitingPayment: 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300',
  InProgress: 'bg-blue-600/15 text-blue-700 dark:text-blue-400',
  Completed: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
  Cancelled: 'bg-red-600/15 text-red-700 dark:text-red-400',
}

function formatDate(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isOrderStatus(value: string): value is OrderStatus {
  return (
    value === 'AwaitingPayment' ||
    value === 'InProgress' ||
    value === 'Completed' ||
    value === 'Cancelled'
  )
}

export function OrdersListPage() {
  const { t } = useTranslation('orders')
  const navigate = useNavigate()
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const normalizedSearch = debouncedSearch.trim()
  const activeSearch = normalizedSearch.length >= 2 ? normalizedSearch : null

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', activeSearch],
    queryFn: ({ signal }) =>
      activeSearch
        ? ordersApi.searchOrders({ q: activeSearch, page: 1, pageSize: 500 }, signal)
        : ordersApi.getOrders(1, 500, signal),
  })

  const columns = useMemo<ColumnDef<OrderListItem>[]>(
    () => [
      {
        id: 'trackingCode',
        accessorKey: 'trackingCode',
        enableColumnFilter: false,
        meta: { label: t('columns.trackingCode') },
        header: () => t('columns.trackingCode'),
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-primary">
            {row.original.trackingCode}
          </span>
        ),
      },
      {
        id: 'customerName',
        accessorFn: (row) => row.customerName ?? '',
        meta: { label: t('columns.name') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.name')} />
        ),
        cell: ({ row }) => row.original.customerName ?? t('noCustomer'),
      },
      {
        id: 'customerPhone',
        accessorFn: (row) => row.customerPhone ?? '',
        meta: { label: t('columns.phone') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.phone')} />
        ),
        cell: ({ row }) => row.original.customerPhone ?? '',
      },
      {
        id: 'customerEmail',
        accessorFn: (row) => row.customerEmail ?? '',
        meta: { label: t('columns.email') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.email')} />
        ),
        cell: ({ row }) => row.original.customerEmail ?? '',
      },
      {
        id: 'customerTelegram',
        accessorFn: (row) => row.customerTelegram ?? '',
        meta: { label: t('columns.telegram') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.telegram')} />
        ),
        cell: ({ row }) => {
          const href = telegramHref(row.original.customerTelegram)
          return href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {formatTelegram(row.original.customerTelegram)}
            </a>
          ) : (
            ''
          )
        },
      },
      {
        id: 'status',
        accessorFn: (row) =>
          isOrderStatus(row.status)
            ? t(`details.orderStatus.${row.status}`)
            : row.status,
        meta: { label: t('columns.status') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.status')} />
        ),
        cell: ({ row }) => {
          const status = isOrderStatus(row.original.status)
            ? row.original.status
            : 'AwaitingPayment'
          return (
            <Badge className={cn('gap-1.5', orderStatusBadgeClass[status])}>
              <span className={cn('size-1.5 shrink-0 rounded-full', orderStatusStyles[status].dot)} />
              {t(`details.orderStatus.${status}`)}
            </Badge>
          )
        },
      },
      {
        id: 'itemsCount',
        accessorKey: 'itemsCount',
        enableColumnFilter: false,
        meta: { label: t('columns.items') },
        header: () => t('columns.items'),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        meta: { label: t('columns.created'), filterVariant: 'dateRange' },
        filterFn: dateRangeFilterFn,
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.created')} />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        meta: { label: t('columns.updated'), filterVariant: 'dateRange' },
        filterFn: dateRangeFilterFn,
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.updated')} />
        ),
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div ref={setToolbarSlot} />

      <Card size="sm">
        <CardHeader className="sr-only">
          <span>{t('title')}</span>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
          ) : isError ? (
            <div className="space-y-2">
              <Alert variant="destructive">
                <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => void refetch()}>
                {t('retry', { ns: 'common' })}
              </Button>
            </div>
          ) : (
            <DataTable
              tableId="orders"
              columns={columns}
              data={data?.items ?? []}
              pageSize={10}
              emptyMessage={activeSearch ? t('emptySearch') : t('empty')}
              onRowClick={(row) => navigate(`/admin/orders/${row.original.id}`)}
              getRowClassName={() => 'cursor-pointer'}
              toolbarContainer={toolbarSlot}
              toolbar={
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={t('searchPlaceholder')}
                />
              }
            />
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 lg:static lg:mx-0 lg:flex lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Button asChild className="w-full lg:w-auto">
          <Link to="/admin/orders/new">
            <Plus />
            {t('create')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
