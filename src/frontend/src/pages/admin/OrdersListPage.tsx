import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import * as ordersApi from '@/features/orders/api/ordersApi'
import type { OrderListItem, OrderStatus } from '@/features/orders/types'
import { OrderStatusBadge } from '@/features/orders/ui/OrderStatusBadge'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { DataTable, DataTableColumnHeader, dateRangeFilterFn } from '@/shared/ui/data-table'

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
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', activeSearch],
    queryFn: () =>
      activeSearch
        ? ordersApi.searchOrders({ q: activeSearch, page: 1, pageSize: 500 })
        : ordersApi.getOrders(1, 500),
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
        id: 'customer',
        accessorFn: (row) => row.customerName ?? t('noCustomer'),
        meta: { label: t('columns.customer') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.customer')} />
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.customerName ?? t('noCustomer')}</div>
            {row.original.customerPhone ? (
              <div className="text-xs text-muted-foreground">{row.original.customerPhone}</div>
            ) : null}
          </div>
        ),
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
            <OrderStatusBadge
              status={status}
              label={t(`details.orderStatus.${status}`)}
            />
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        <Button asChild>
          <Link to="/admin/orders/new">
            <Plus />
            {t('create')}
          </Link>
        </Button>
      </div>

      <Card>
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
              toolbar={
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const value = search.trim()
                    if (value.length >= 2) {
                      setActiveSearch(value)
                    }
                  }}
                >
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                  />
                  <Button type="submit" variant="outline">
                    <Search />
                    {t('search')}
                  </Button>
                  {activeSearch ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSearch('')
                        setActiveSearch(null)
                      }}
                    >
                      {t('clearSearch')}
                    </Button>
                  ) : null}
                </form>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
