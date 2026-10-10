import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import * as salesOrdersApi from '@/features/orders/api/salesOrdersApi'
import type { SalesOrderListItem } from '@/features/orders/api/salesOrdersApi'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { DataTable, DataTableColumnHeader, dateRangeFilterFn } from '@/shared/ui/data-table'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function SalesOrdersListPage() {
  const { t } = useTranslation('orders')
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: ({ signal }) => salesOrdersApi.getSalesOrders(signal),
  })

  const columns = useMemo<ColumnDef<SalesOrderListItem>[]>(() => [
    {
      accessorKey: 'trackingCode',
      meta: { label: t('salesOrders.columns.number') },
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title={t('salesOrders.columns.number')} />,
      cell: ({ row }) => <span className="font-mono font-semibold text-primary">{row.original.trackingCode}</span>,
    },
    {
      accessorKey: 'requestTrackingCode',
      meta: { label: t('salesOrders.columns.request') },
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title={t('salesOrders.columns.request')} />,
    },
    {
      accessorKey: 'customerName',
      meta: { label: t('columns.name') },
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title={t('columns.name')} />,
      cell: ({ row }) => row.original.customerName || t('noCustomer'),
    },
    {
      accessorKey: 'customerPhone',
      meta: { label: t('columns.phone') },
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title={t('columns.phone')} />,
    },
    {
      accessorKey: 'status',
      meta: { label: t('columns.status') },
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title={t('columns.status')} />,
      cell: ({ row }) => t(`details.orderStatus.${row.original.status}`, { defaultValue: row.original.status }),
    },
    {
      accessorKey: 'itemsCount',
      meta: { label: t('columns.items') },
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title={t('columns.items')} />,
    },
    {
      accessorKey: 'createdAt',
      meta: { label: t('columns.created'), filterVariant: 'dateRange' },
      filterFn: dateRangeFilterFn,
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title={t('columns.created')} />,
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ], [t])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('salesOrders.title')}</h1>
      <Card size="sm">
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
            : isError ? <div className="space-y-2"><Alert variant="destructive"><AlertDescription>{t('error', { ns: 'common' })}</AlertDescription></Alert><Button variant="outline" onClick={() => void refetch()}>{t('retry', { ns: 'common' })}</Button></div>
              : <DataTable
                tableId="sales-orders"
                columns={columns}
                data={data ?? []}
                pageSize={10}
                emptyMessage={t('salesOrders.empty')}
                onRowClick={(row) => navigate(`/admin/orders/${row.original.id}`)}
                getRowClassName={() => 'cursor-pointer'}
              />}
        </CardContent>
      </Card>
    </div>
  )
}
