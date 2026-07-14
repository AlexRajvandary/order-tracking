import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import * as dashboardApi from '@/features/dashboard/api/dashboardApi'
import type { AuditFieldChange, DashboardAudit } from '@/features/dashboard/types'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { DataTable, DataTableColumnHeader, dateRangeFilterFn } from '@/shared/ui/data-table'

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

      <Card>
        <CardHeader>
          <CardTitle>{t('recentOrders')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!data.recentOrders.length ? (
            <p className="text-sm text-muted-foreground">{t('emptyOrders')}</p>
          ) : (
            <ul className="divide-y">
              {data.recentOrders.map((order) => (
                <li key={order.id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="font-mono font-medium text-primary hover:underline"
                    >
                      {order.trackingCode}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName ?? t('noCustomer')}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                </li>
              ))}
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
