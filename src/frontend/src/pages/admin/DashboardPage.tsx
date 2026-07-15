import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardList, ShieldCheck, Users } from 'lucide-react'
import * as dashboardApi from '@/features/dashboard/api/dashboardApi'
import * as adminsApi from '@/features/admins/api/adminsApi'
import type { AuditFieldChange, DashboardAudit } from '@/features/dashboard/types'
import type { OrderStatus } from '@/features/orders/types'
import { orderStatusStyles } from '@/features/orders/ui/OrderStatusBadge'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { DataTable, DataTableColumnHeader, dateRangeFilterFn } from '@/shared/ui/data-table'
import { cn } from '@/shared/lib/utils'

function isOrderStatus(value: string): value is OrderStatus {
  return (
    value === 'AwaitingPayment' ||
    value === 'InProgress' ||
    value === 'Completed' ||
    value === 'Cancelled'
  )
}

function StatCard({
  icon,
  value,
  label,
  onClick,
}: {
  icon: React.ReactNode
  value: number
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex aspect-square flex-col justify-between rounded-xl border bg-card p-2.5 text-left shadow-xs transition-colors sm:p-4',
        'hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:size-9 [&>svg]:size-4 sm:[&>svg]:size-5">
        {icon}
      </span>
      <span className="space-y-0.5">
        <span className="block text-lg font-bold tabular-nums sm:text-2xl">{value}</span>
        <span className="block text-xs text-muted-foreground sm:text-sm">{label}</span>
      </span>
    </button>
  )
}

function formatDate(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatAuditValue(value: string | null, emptyLabel: string) {
  return value === null || value === '' ? emptyLabel : value
}

function AuditChanges({
  changes,
  emptyLabel,
  fromLabel,
  toLabel,
}: {
  changes: AuditFieldChange[]
  emptyLabel: string
  fromLabel: string
  toLabel: string
}) {
  if (!changes.length) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <ul className="space-y-1 text-xs leading-snug">
      {changes.map((change) => (
        <li key={change.field}>
          <span className="font-medium text-foreground">{change.field}</span>
          <span className="text-muted-foreground">
            {' '}
            · {fromLabel}{' '}
            <span className="text-foreground">
              {formatAuditValue(change.oldValue, emptyLabel)}
            </span>
            {' → '}
            {toLabel}{' '}
            <span className="text-foreground">
              {formatAuditValue(change.newValue, emptyLabel)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getDashboardSummary,
  })

  const { data: admins } = useQuery({
    queryKey: ['admins'],
    queryFn: adminsApi.getAdmins,
  })

  const columns = useMemo<ColumnDef<DashboardAudit>[]>(
    () => [
      {
        id: 'action',
        accessorKey: 'action',
        meta: { label: t('columns.action') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.action')} />
        ),
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">{row.original.action}</span>
        ),
      },
      {
        id: 'entityType',
        accessorKey: 'entityType',
        meta: { label: t('columns.entity') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.entity')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">{row.original.entityType}</span>
        ),
      },
      {
        id: 'changes',
        accessorFn: (row) =>
          (row.changes ?? []).map((c) => c.field).join(', ') || '',
        enableColumnFilter: false,
        meta: { label: t('columns.changes') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.changes')} />
        ),
        cell: ({ row }) => (
          <AuditChanges
            changes={row.original.changes ?? []}
            emptyLabel={t('changeEmpty')}
            fromLabel={t('changeFrom')}
            toLabel={t('changeTo')}
          />
        ),
      },
      {
        id: 'adminLogin',
        accessorFn: (row) => row.adminLogin ?? '',
        meta: { label: t('columns.admin') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.admin')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {row.original.adminLogin ?? '—'}
          </span>
        ),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        meta: { label: t('columns.created'), filterVariant: 'dateRange' },
        filterFn: dateRangeFilterFn,
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.created')} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t],
  )

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
  }

  if (isError || !data) {
    return (
      <div className="space-y-2">
        <Alert variant="destructive">
          <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void refetch()}>
          {t('retry', { ns: 'common' })}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 sm:max-w-md">
        <StatCard
          icon={<ClipboardList />}
          value={data.totalOrders}
          label={t('metrics.orders')}
          onClick={() => navigate('/admin/orders')}
        />
        <StatCard
          icon={<Users />}
          value={data.totalCustomers}
          label={t('metrics.customers')}
          onClick={() => navigate('/admin/customers')}
        />
        <StatCard
          icon={<ShieldCheck />}
          value={admins?.length ?? 0}
          label={t('metrics.admins')}
          onClick={() => navigate('/admin/admins')}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentOrders')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!data.recentOrders.length ? (
            <p className="text-sm text-muted-foreground">{t('emptyOrders')}</p>
          ) : (
            <ul className="divide-y">
              {data.recentOrders.map((order) => {
                const status = isOrderStatus(order.status)
                  ? order.status
                  : 'AwaitingPayment'
                return (
                  <li
                    key={order.id}
                    className="flex cursor-pointer items-start justify-between gap-3 py-2 -mx-2 px-2 rounded-md hover:bg-muted/50"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <div className="space-y-1">
                      <span className="block font-mono font-medium text-primary">
                        {order.trackingCode}
                      </span>
                      <Badge variant="secondary" className="gap-1.5">
                        <span
                          className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            orderStatusStyles[status].dot,
                          )}
                        />
                        {t(`details.orderStatus.${status}`, { ns: 'orders' })}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="p-3">
          <DataTable
            tableId="audit"
            columns={columns}
            data={data.recentAudit}
            pageSize={10}
            emptyMessage={t('emptyAudit')}
            className="space-y-3"
            onRowClick={(row) => navigate(`/admin/audit/${row.original.id}`)}
            getRowClassName={() => 'cursor-pointer'}
            renderToolbar={({ viewOptions }) => (
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{t('recentAudit')}</CardTitle>
                {viewOptions}
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
