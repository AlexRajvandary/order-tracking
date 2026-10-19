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

const ORDER_STAGES = ['purchase', 'originWarehouse', 'transit', 'moscow', 'customerDelivery'] as const

const STATUS_STAGE_INDEX: Record<string, number> = {
  RequiredPurchase: 0,
  Purchased: 0,
  AwaitingWarehouse: 1,
  AtOriginWarehouse: 1,
  AwaitingTransitShipment: 2,
  SentToTransit: 2,
  ArrivedTransitCountry: 2,
  AwaitingMoscowShipment: 3,
  SentToMoscow: 3,
  ArrivedMoscow: 3,
  AwaitingCustomerShipment: 4,
  HandedToDelivery: 4,
  Delivered: ORDER_STAGES.length,
}

function MiniOrderStepper({ statuses }: { statuses: string[] }) {
  const { t } = useTranslation('procurements')
  const knownStages = statuses.map((status) => STATUS_STAGE_INDEX[status]).filter((stage) => stage !== undefined)
  // Order progress follows its least advanced product, so the indicator never
  // suggests the whole order has passed a stage while an item is still there.
  const currentStage = knownStages.length ? Math.min(...knownStages) : -1

  return (
    <div role="list" aria-label={t('board.progressLabel')} className="flex w-[116px] items-start" title={statuses.map((status) => t(`statuses.lifecycle.${status}`)).join(', ') || undefined}>
      {ORDER_STAGES.map((stage, index) => {
        const complete = currentStage > index
        const active = currentStage === index
        const state = complete ? t('board.stepComplete') : active ? t('board.stepCurrent') : t('board.stepUpcoming')

        return (
          <div key={stage} role="listitem" aria-current={active ? 'step' : undefined} aria-label={`${t(`board.stepper.${stage}`)}: ${state}`} className="relative flex min-w-0 flex-1 justify-center">
            {index < ORDER_STAGES.length - 1 ? <span aria-hidden="true" className={`absolute left-1/2 right-[-50%] top-[4px] h-px ${complete ? 'bg-slate-500' : 'bg-slate-200'}`} /> : null}
            <span aria-hidden="true" className={`relative z-10 size-[8px] rounded-full ${complete ? 'bg-slate-500' : active ? 'border-2 border-blue-500 bg-white' : 'border border-slate-300 bg-white'}`} title={`${t(`board.stepper.${stage}`)} · ${state}`} />
          </div>
        )
      })}
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function SalesOrdersListPage() {
  const { t } = useTranslation('orders')
  const { t: tp } = useTranslation('procurements')
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
      id: 'progress',
      accessorFn: (row) => row.productStatuses.map((status) => STATUS_STAGE_INDEX[status] ?? -1).join(','),
      meta: { label: t('salesOrders.columns.progress') },
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title={t('salesOrders.columns.progress')} />,
      cell: ({ row }) => <MiniOrderStepper statuses={row.original.productStatuses} />,
    },
    {
      id: 'productStatuses',
      accessorFn: (row) => row.productStatuses.map((status) => tp(`statuses.lifecycle.${status}`)).join(', '),
      meta: { label: t('salesOrders.columns.productStatuses') },
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title={t('salesOrders.columns.productStatuses')} />,
      cell: ({ row }) => row.original.productStatuses.length
        ? <div className="flex flex-wrap gap-1">{row.original.productStatuses.map((status) => <span key={status} className="rounded-full bg-muted px-2 py-0.5 text-xs">{tp(`statuses.lifecycle.${status}`)}</span>)}</div>
        : <span className="text-muted-foreground">{t('salesOrders.notSentToProcurement')}</span>,
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
  ], [t, tp])

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
