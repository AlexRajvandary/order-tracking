import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Pencil, Save, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as procurementsApi from '@/features/procurements/api/procurementsApi'
import type {
  ArrivalStatus,
  ProcurementRow,
  PurchaseStatus,
  ShipmentStatus,
  UpdateProcurementRequest,
} from '@/features/procurements/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const purchaseStatuses: PurchaseStatus[] = ['Pending', 'Purchased', 'Error']
const arrivalStatuses: ArrivalStatus[] = ['Pending', 'Received']
const shipmentStatuses: ShipmentStatus[] = ['AwaitingShipment', 'Shipped']

function LinkAndStatus({
  url,
  editing,
  onUrlChange,
  status,
  statuses,
  statusGroup,
  onStatusChange,
}: {
  url: string
  editing: boolean
  onUrlChange: (value: string) => void
  status: string
  statuses: string[]
  statusGroup: 'purchase' | 'arrival' | 'shipment'
  onStatusChange: (value: string) => void
}) {
  const { t } = useTranslation('procurements')
  const href = /^https?:\/\//i.test(url.trim()) ? url.trim() : null

  if (!editing) {
    return (
      <div className="min-w-56 space-y-2">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-1.5 break-all text-sm text-primary hover:underline"
          >
            <span>{url}</span>
            <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
          </a>
        ) : (
          <p className="break-all text-sm">{url || '—'}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {t(`statuses.${statusGroup}.${status}`)}
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-56 space-y-2">
      <div className="flex items-center gap-1.5">
        <Input
          type="url"
          value={url}
          placeholder={t('linkPlaceholder')}
          onChange={(event) => onUrlChange(event.target.value)}
        />
        {href ? (
          <Button asChild type="button" variant="ghost" size="icon-sm">
            <a href={href} target="_blank" rel="noreferrer" aria-label={t('openLink')}>
              <ExternalLink />
            </a>
          </Button>
        ) : null}
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`statuses.${statusGroup}.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function EditableRow({
  row,
  saving,
  deleting,
  onSave,
  onDelete,
}: {
  row: ProcurementRow
  saving: boolean
  deleting: boolean
  onSave: (id: string, request: UpdateProcurementRequest) => Promise<void>
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation('procurements')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateProcurementRequest>({
    purchaseUrl: row.purchaseUrl,
    purchaseStatus: row.purchaseStatus,
    arrivalUrl: row.arrivalUrl,
    arrivalStatus: row.arrivalStatus,
    shipmentUrl: row.shipmentUrl,
    shipmentStatus: row.shipmentStatus,
  })

  useEffect(() => {
    setForm({
      purchaseUrl: row.purchaseUrl,
      purchaseStatus: row.purchaseStatus,
      arrivalUrl: row.arrivalUrl,
      arrivalStatus: row.arrivalStatus,
      shipmentUrl: row.shipmentUrl,
      shipmentStatus: row.shipmentStatus,
    })
  }, [row])

  const cancelEditing = () => {
    setForm({
      purchaseUrl: row.purchaseUrl,
      purchaseStatus: row.purchaseStatus,
      arrivalUrl: row.arrivalUrl,
      arrivalStatus: row.arrivalStatus,
      shipmentUrl: row.shipmentUrl,
      shipmentStatus: row.shipmentStatus,
    })
    setEditing(false)
  }

  const save = async () => {
    try {
      await onSave(row.id, form)
      setEditing(false)
    } catch {
      // The mutation displays the API error above the table and keeps the row editable.
    }
  }

  return (
    <TableRow>
      <TableCell className="align-top">
        <Link
          to={`/admin/orders/${row.orderId}`}
          className="font-mono font-semibold text-primary hover:underline"
        >
          {row.trackingCode}
        </Link>
      </TableCell>
      <TableCell className="max-w-64 whitespace-normal align-top">
        <p className="font-medium">{row.itemName}</p>
        {row.productUrl ? (
          <a
            href={row.productUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t('source')} <ExternalLink className="size-3" />
          </a>
        ) : null}
      </TableCell>
      <TableCell className="align-top">
        <LinkAndStatus
          url={form.purchaseUrl ?? ''}
          editing={editing}
          onUrlChange={(purchaseUrl) => setForm((value) => ({ ...value, purchaseUrl }))}
          status={form.purchaseStatus}
          statuses={purchaseStatuses}
          statusGroup="purchase"
          onStatusChange={(purchaseStatus) =>
            setForm((value) => ({ ...value, purchaseStatus: purchaseStatus as PurchaseStatus }))
          }
        />
      </TableCell>
      <TableCell className="align-top">
        <LinkAndStatus
          url={form.arrivalUrl ?? ''}
          editing={editing}
          onUrlChange={(arrivalUrl) => setForm((value) => ({ ...value, arrivalUrl }))}
          status={form.arrivalStatus}
          statuses={arrivalStatuses}
          statusGroup="arrival"
          onStatusChange={(arrivalStatus) =>
            setForm((value) => ({ ...value, arrivalStatus: arrivalStatus as ArrivalStatus }))
          }
        />
      </TableCell>
      <TableCell className="align-top">
        <LinkAndStatus
          url={form.shipmentUrl ?? ''}
          editing={editing}
          onUrlChange={(shipmentUrl) => setForm((value) => ({ ...value, shipmentUrl }))}
          status={form.shipmentStatus}
          statuses={shipmentStatuses}
          statusGroup="shipment"
          onStatusChange={(shipmentStatus) =>
            setForm((value) => ({ ...value, shipmentStatus: shipmentStatus as ShipmentStatus }))
          }
        />
      </TableCell>
      <TableCell className="align-top">
        <div className="flex gap-1">
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={saving || deleting}
                title={t('save')}
                aria-label={t('save')}
                onClick={() => void save()}
              >
                <Save />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={saving || deleting}
                title={t('cancel')}
                aria-label={t('cancel')}
                onClick={cancelEditing}
              >
                <X />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={deleting}
                title={t('edit')}
                aria-label={t('edit')}
                onClick={() => setEditing(true)}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                disabled={deleting}
                title={t('delete')}
                aria-label={t('delete')}
                onClick={() => {
                  if (window.confirm(t('deleteConfirm'))) onDelete(row.id)
                }}
              >
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function ProcurementsPage() {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['procurements'],
    queryFn: ({ signal }) => procurementsApi.getProcurements(signal),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateProcurementRequest }) =>
      procurementsApi.updateProcurement(id, request),
    onSuccess: (updated) => {
      setError(null)
      queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) =>
        rows?.map((row) => (row.id === updated.id ? updated : row)),
      )
    },
    onError: (value: unknown) =>
      setError(value instanceof ApiError ? value.message : t('updateError')),
  })

  const deleteMutation = useMutation({
    mutationFn: procurementsApi.deleteProcurement,
    onSuccess: (_, id) => {
      setError(null)
      queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) =>
        rows?.filter((row) => row.id !== id),
      )
    },
    onError: (value: unknown) =>
      setError(value instanceof ApiError ? value.message : t('deleteError')),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="sr-only">
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
          ) : query.isError ? (
            <div className="space-y-3 p-6">
              <Alert variant="destructive">
                <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => void query.refetch()}>
                {t('retry', { ns: 'common' })}
              </Button>
            </div>
          ) : query.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('request')}</TableHead>
                  <TableHead>{t('item')}</TableHead>
                  <TableHead>{t('purchase')}</TableHead>
                  <TableHead>{t('arrival')}</TableHead>
                  <TableHead>{t('shipment')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((row) => (
                  <EditableRow
                    key={row.id}
                    row={row}
                    saving={updateMutation.isPending && updateMutation.variables?.id === row.id}
                    deleting={deleteMutation.isPending && deleteMutation.variables === row.id}
                    onSave={(id, request) =>
                      updateMutation.mutateAsync({ id, request }).then(() => undefined)
                    }
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">{t('empty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
