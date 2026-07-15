import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as dashboardApi from '@/features/dashboard/api/dashboardApi'
import { translateAuditName } from '@/features/dashboard/lib/auditI18n'
import type { AuditFieldChange, DashboardAudit } from '@/features/dashboard/types'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
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
  translateField,
}: {
  changes: AuditFieldChange[]
  emptyLabel: string
  fromLabel: string
  toLabel: string
  translateField: (value: string) => string
}) {
  if (!changes.length) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <ul className="space-y-1 text-xs leading-snug">
      {changes.map((change) => (
        <li key={change.field}>
          <span className="font-medium text-foreground">
            {translateField(change.field)}
          </span>
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

export function AuditPage() {
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
        accessorFn: (row) => translateAuditName(t, 'actions', row.action),
        meta: { label: t('columns.action') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.action')} />
        ),
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">
            {translateAuditName(t, 'actions', row.original.action)}
          </span>
        ),
      },
      {
        id: 'entityType',
        accessorFn: (row) => translateAuditName(t, 'entities', row.entityType),
        meta: { label: t('columns.entity') },
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.entity')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {translateAuditName(t, 'entities', row.original.entityType)}
          </span>
        ),
      },
      {
        id: 'changes',
        accessorFn: (row) =>
          (row.changes ?? [])
            .map((change) => translateAuditName(t, 'fields', change.field))
            .join(', '),
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
            translateField={(value) => translateAuditName(t, 'fields', value)}
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
      <h1 className="text-2xl font-bold">{t('audit.title')}</h1>

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
              <div className="flex justify-end">{viewOptions}</div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
