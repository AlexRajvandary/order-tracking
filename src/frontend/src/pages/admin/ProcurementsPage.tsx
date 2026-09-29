import { useEffect, useState, type ReactNode } from 'react'
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
  WarehouseCondition,
} from '@/features/procurements/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const purchaseStatuses: PurchaseStatus[] = ['Pending', 'Purchased', 'Error']
const arrivalStatuses: ArrivalStatus[] = ['Pending', 'Received']
const shipmentStatuses: ShipmentStatus[] = ['AwaitingShipment', 'Shipped']
const warehouseConditions: WarehouseCondition[] = ['Ok', 'Damaged', 'WrongItem', 'Incomplete']

const rowGridClassName =
  'grid min-w-[1460px] grid-cols-[120px_180px_290px_280px_290px_80px] items-start'

function emptyToNull(value: string) {
  return value === '' ? null : value
}

function numberOrNull(value: string) {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function displayNumber(value: number | null | undefined) {
  return value == null ? '—' : value.toLocaleString()
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-medium text-muted-foreground">{children}</span>
}

function ReadField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="min-h-5 break-words text-sm">{value || '—'}</div>
    </div>
  )
}

function EditField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  )
}

function StatusSelect({
  value,
  values,
  group,
  onChange,
}: {
  value: string
  values: string[]
  group: 'purchase' | 'arrival' | 'shipment'
  onChange: (value: string) => void
}) {
  const { t } = useTranslation('procurements')
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((status) => (
          <SelectItem key={status} value={status}>
            {t(`statuses.${group}.${status}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FileUploadButton({
  accept,
  multiple,
  disabled,
  label,
  onFiles,
}: {
  accept?: string
  multiple?: boolean
  disabled: boolean
  label: string
  onFiles: (files: File[]) => void
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="h-8 w-full cursor-pointer justify-start overflow-hidden"
      aria-disabled={disabled}
    >
      <label>
        <span className="truncate">{label}</span>
        <input
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ''
            if (files.length) onFiles(files)
          }}
        />
      </label>
    </Button>
  )
}

function createForm(row: ProcurementRow): UpdateProcurementRequest {
  return {
    purchaseUrl: row.purchaseUrl,
    purchaseStatus: row.purchaseStatus,
    purchasePrice: row.purchasePrice ?? null,
    sellerOrderNumber: row.sellerOrderNumber ?? null,
    warehouseTrackingNumber: row.warehouseTrackingNumber ?? null,
    arrivalStatus: row.arrivalStatus,
    warehouseReceivedAt: row.warehouseReceivedAt ?? null,
    warehouseCondition: row.warehouseCondition ?? null,
    shippingTrackingNumber: row.shippingTrackingNumber ?? null,
    shipmentStatus: row.shipmentStatus,
    shippingMethod: row.shippingMethod ?? null,
    shippingWeight: row.shippingWeight ?? null,
    shippingCost: row.shippingCost ?? null,
    shippedAt: row.shippedAt ?? null,
  }
}

function EditableRow({
  row,
  saving,
  deleting,
  uploading,
  onSave,
  onDelete,
  onReceiptUpload,
  onPhotosUpload,
}: {
  row: ProcurementRow
  saving: boolean
  deleting: boolean
  uploading: boolean
  onSave: (id: string, request: UpdateProcurementRequest) => Promise<void>
  onDelete: (id: string) => void
  onReceiptUpload: (id: string, file: File) => Promise<void>
  onPhotosUpload: (id: string, files: File[]) => Promise<void>
}) {
  const { t } = useTranslation('procurements')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateProcurementRequest>(() => createForm(row))
  const attachments = row.attachments ?? []
  const receipt = attachments.find((value) => value.kind === 'Receipt')
  const warehousePhotos = attachments.filter((value) => value.kind === 'WarehousePhoto')

  useEffect(
    () =>
      setForm({
        purchaseUrl: row.purchaseUrl,
        purchaseStatus: row.purchaseStatus,
        purchasePrice: row.purchasePrice ?? null,
        sellerOrderNumber: row.sellerOrderNumber ?? null,
        warehouseTrackingNumber: row.warehouseTrackingNumber ?? null,
        arrivalStatus: row.arrivalStatus,
        warehouseReceivedAt: row.warehouseReceivedAt ?? null,
        warehouseCondition: row.warehouseCondition ?? null,
        shippingTrackingNumber: row.shippingTrackingNumber ?? null,
        shipmentStatus: row.shipmentStatus,
        shippingMethod: row.shippingMethod ?? null,
        shippingWeight: row.shippingWeight ?? null,
        shippingCost: row.shippingCost ?? null,
        shippedAt: row.shippedAt ?? null,
      }),
    [
      row.purchaseUrl,
      row.purchaseStatus,
      row.purchasePrice,
      row.sellerOrderNumber,
      row.warehouseTrackingNumber,
      row.arrivalStatus,
      row.warehouseReceivedAt,
      row.warehouseCondition,
      row.shippingTrackingNumber,
      row.shipmentStatus,
      row.shippingMethod,
      row.shippingWeight,
      row.shippingCost,
      row.shippedAt,
    ],
  )

  const cancelEditing = () => {
    setForm(createForm(row))
    setEditing(false)
  }

  const save = async () => {
    try {
      await onSave(row.id, form)
      setEditing(false)
    } catch {
      // The mutation keeps the row editable and displays the API error above the block.
    }
  }

  const statusText = (group: 'purchase' | 'arrival' | 'shipment', status: string) =>
    t(`statuses.${group}.${status}`)

  return (
    <div className={`${rowGridClassName} border-t first:border-t-0`}>
      <div className="p-3">
        <Link
          to={`/admin/orders/${row.orderId}`}
          className="font-mono text-sm font-semibold text-primary hover:underline"
        >
          {row.trackingCode}
        </Link>
      </div>

      <div className="min-w-0 border-l p-3">
        <p className="break-words text-sm font-medium">{row.itemName}</p>
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
      </div>

      <div className="space-y-2 border-l p-3">
        {editing ? (
          <>
            <EditField label={t('fields.purchaseUrl')}>
              <Input
                className="h-8"
                type="url"
                value={form.purchaseUrl ?? ''}
                onChange={(event) =>
                  setForm((value) => ({ ...value, purchaseUrl: emptyToNull(event.target.value) }))
                }
              />
            </EditField>
            <EditField label={t('fields.purchaseStatus')}>
              <StatusSelect
                value={form.purchaseStatus}
                values={purchaseStatuses}
                group="purchase"
                onChange={(purchaseStatus) =>
                  setForm((value) => ({ ...value, purchaseStatus: purchaseStatus as PurchaseStatus }))
                }
              />
            </EditField>
            <EditField label={t('fields.purchasePrice')}>
              <Input
                className="h-8"
                type="number"
                min="0"
                step="0.01"
                value={form.purchasePrice ?? ''}
                onChange={(event) =>
                  setForm((value) => ({ ...value, purchasePrice: numberOrNull(event.target.value) }))
                }
              />
            </EditField>
            <EditField label={t('fields.sellerOrderNumber')}>
              <Input
                className="h-8"
                value={form.sellerOrderNumber ?? ''}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    sellerOrderNumber: emptyToNull(event.target.value),
                  }))
                }
              />
            </EditField>
            <FileUploadButton
              accept="image/*,application/pdf"
              disabled={uploading}
              label={uploading ? t('uploading') : receipt?.fileName ? `✓ ${receipt.fileName}` : t('addReceipt')}
              onFiles={([file]) => void onReceiptUpload(row.id, file).catch(() => undefined)}
            />
          </>
        ) : (
          <>
            <ReadField label={t('fields.purchaseUrl')} value={row.purchaseUrl} />
            <ReadField
              label={t('fields.purchaseStatus')}
              value={statusText('purchase', row.purchaseStatus)}
            />
            <ReadField label={t('fields.purchasePrice')} value={displayNumber(row.purchasePrice)} />
            <ReadField label={t('fields.sellerOrderNumber')} value={row.sellerOrderNumber} />
            <ReadField label={t('fields.receipt')} value={receipt?.fileName ? `✓ ${receipt.fileName}` : '—'} />
          </>
        )}
      </div>

      <div className="space-y-2 border-l p-3">
        {editing ? (
          <>
            <EditField label={t('fields.warehouseTrackingNumber')}>
              <Input
                className="h-8"
                value={form.warehouseTrackingNumber ?? ''}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    warehouseTrackingNumber: emptyToNull(event.target.value),
                  }))
                }
              />
            </EditField>
            <EditField label={t('fields.arrivalStatus')}>
              <StatusSelect
                value={form.arrivalStatus}
                values={arrivalStatuses}
                group="arrival"
                onChange={(arrivalStatus) =>
                  setForm((value) => ({ ...value, arrivalStatus: arrivalStatus as ArrivalStatus }))
                }
              />
            </EditField>
            <EditField label={t('fields.warehouseReceivedAt')}>
              <Input
                className="h-8"
                type="date"
                value={form.warehouseReceivedAt ?? ''}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    warehouseReceivedAt: emptyToNull(event.target.value),
                  }))
                }
              />
            </EditField>
            <FileUploadButton
              accept="image/*"
              multiple
              disabled={uploading}
              label={
                uploading
                  ? t('uploading')
                  : warehousePhotos.length
                    ? t('photoCount', { count: warehousePhotos.length })
                    : t('addPhotos')
              }
              onFiles={(files) => void onPhotosUpload(row.id, files).catch(() => undefined)}
            />
            <EditField label={t('fields.warehouseCondition')}>
              <Select
                value={form.warehouseCondition ?? 'Unspecified'}
                onValueChange={(warehouseCondition) =>
                  setForm((value) => ({
                    ...value,
                    warehouseCondition:
                      warehouseCondition === 'Unspecified'
                        ? null
                        : (warehouseCondition as WarehouseCondition),
                  }))
                }
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unspecified">{t('conditions.Unspecified')}</SelectItem>
                  {warehouseConditions.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {t(`conditions.${condition}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EditField>
          </>
        ) : (
          <>
            <ReadField label={t('fields.warehouseTrackingNumber')} value={row.warehouseTrackingNumber} />
            <ReadField
              label={t('fields.arrivalStatus')}
              value={statusText('arrival', row.arrivalStatus)}
            />
            <ReadField label={t('fields.warehouseReceivedAt')} value={row.warehouseReceivedAt} />
            <ReadField
              label={t('fields.warehousePhotos')}
              value={warehousePhotos.length ? t('photoCount', { count: warehousePhotos.length }) : '—'}
            />
            <ReadField
              label={t('fields.warehouseCondition')}
              value={row.warehouseCondition ? t(`conditions.${row.warehouseCondition}`) : '—'}
            />
          </>
        )}
      </div>

      <div className="space-y-2 border-l p-3">
        {editing ? (
          <>
            <EditField label={t('fields.shippingTrackingNumber')}>
              <Input
                className="h-8"
                value={form.shippingTrackingNumber ?? ''}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    shippingTrackingNumber: emptyToNull(event.target.value),
                  }))
                }
              />
            </EditField>
            <EditField label={t('fields.shipmentStatus')}>
              <StatusSelect
                value={form.shipmentStatus}
                values={shipmentStatuses}
                group="shipment"
                onChange={(shipmentStatus) =>
                  setForm((value) => ({ ...value, shipmentStatus: shipmentStatus as ShipmentStatus }))
                }
              />
            </EditField>
            <EditField label={t('fields.shippingMethod')}>
              <Input
                className="h-8"
                value={form.shippingMethod ?? ''}
                onChange={(event) =>
                  setForm((value) => ({ ...value, shippingMethod: emptyToNull(event.target.value) }))
                }
              />
            </EditField>
            <EditField label={t('fields.shippingWeight')}>
              <Input
                className="h-8"
                type="number"
                min="0"
                step="0.001"
                value={form.shippingWeight ?? ''}
                onChange={(event) =>
                  setForm((value) => ({ ...value, shippingWeight: numberOrNull(event.target.value) }))
                }
              />
            </EditField>
            <EditField label={t('fields.shippingCost')}>
              <Input
                className="h-8"
                type="number"
                min="0"
                step="0.01"
                value={form.shippingCost ?? ''}
                onChange={(event) =>
                  setForm((value) => ({ ...value, shippingCost: numberOrNull(event.target.value) }))
                }
              />
            </EditField>
            <EditField label={t('fields.shippedAt')}>
              <Input
                className="h-8"
                type="date"
                value={form.shippedAt ?? ''}
                onChange={(event) =>
                  setForm((value) => ({ ...value, shippedAt: emptyToNull(event.target.value) }))
                }
              />
            </EditField>
          </>
        ) : (
          <>
            <ReadField label={t('fields.shippingTrackingNumber')} value={row.shippingTrackingNumber} />
            <ReadField
              label={t('fields.shipmentStatus')}
              value={statusText('shipment', row.shipmentStatus)}
            />
            <ReadField label={t('fields.shippingMethod')} value={row.shippingMethod} />
            <ReadField label={t('fields.shippingWeight')} value={displayNumber(row.shippingWeight)} />
            <ReadField label={t('fields.shippingCost')} value={displayNumber(row.shippingCost)} />
            <ReadField label={t('fields.shippedAt')} value={row.shippedAt} />
          </>
        )}
      </div>

      <div className="border-l p-3">
        <div className="flex flex-col gap-1">
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={saving || deleting || uploading}
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
                disabled={saving || deleting || uploading}
                title={t('cancel')}
                aria-label={t('cancel')}
                onClick={cancelEditing}
              >
                <X />
              </Button>
            </>
          ) : (
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
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            disabled={saving || deleting || uploading}
            title={t('delete')}
            aria-label={t('delete')}
            onClick={() => {
              if (window.confirm(t('deleteConfirm'))) onDelete(row.id)
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ProcurementsPage() {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const updateRows = (updater: (rows: ProcurementRow[]) => ProcurementRow[]) =>
    queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) =>
      rows ? updater(rows) : rows,
    )

  const query = useQuery({
    queryKey: ['procurements'],
    queryFn: ({ signal }) => procurementsApi.getProcurements(signal),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateProcurementRequest }) =>
      procurementsApi.updateProcurement(id, request),
    onSuccess: (updated) => {
      setError(null)
      updateRows((rows) => rows.map((row) => (row.id === updated.id ? updated : row)))
    },
    onError: (value: unknown) =>
      setError(value instanceof ApiError ? value.message : t('updateError')),
  })

  const deleteMutation = useMutation({
    mutationFn: procurementsApi.deleteProcurement,
    onSuccess: (_, id) => {
      setError(null)
      updateRows((rows) => rows.filter((row) => row.id !== id))
    },
    onError: (value: unknown) =>
      setError(value instanceof ApiError ? value.message : t('deleteError')),
  })

  const receiptMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      procurementsApi.uploadReceipt(id, file),
    onSuccess: (receipt, { id }) => {
      setError(null)
      updateRows((rows) =>
        rows.map((row) =>
          row.id === id
            ? {
                ...row,
                attachments: [
                  ...(row.attachments ?? []).filter((value) => value.kind !== 'Receipt'),
                  receipt,
                ],
              }
            : row,
        ),
      )
    },
    onError: (value: unknown) =>
      setError(value instanceof ApiError ? value.message : t('uploadError')),
  })

  const photosMutation = useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      procurementsApi.uploadWarehousePhotos(id, files),
    onSuccess: (photos, { id }) => {
      setError(null)
      updateRows((rows) =>
        rows.map((row) =>
          row.id === id ? { ...row, attachments: [...(row.attachments ?? []), ...photos] } : row,
        ),
      )
    },
    onError: (value: unknown) =>
      setError(value instanceof ApiError ? value.message : t('uploadError')),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden">
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
            <div className="overflow-x-auto">
              <div className={`${rowGridClassName} bg-muted/40 text-xs font-semibold`}>
                <div className="p-3">{t('request')}</div>
                <div className="border-l p-3">{t('item')}</div>
                <div className="border-l p-3">{t('purchase')}</div>
                <div className="border-l p-3">{t('arrival')}</div>
                <div className="border-l p-3">{t('shipment')}</div>
                <div className="border-l p-3">{t('actions')}</div>
              </div>
              {query.data.map((row) => (
                <EditableRow
                  key={row.id}
                  row={row}
                  saving={updateMutation.isPending && updateMutation.variables?.id === row.id}
                  deleting={deleteMutation.isPending && deleteMutation.variables === row.id}
                  uploading={
                    (receiptMutation.isPending && receiptMutation.variables?.id === row.id) ||
                    (photosMutation.isPending && photosMutation.variables?.id === row.id)
                  }
                  onSave={(id, request) =>
                    updateMutation.mutateAsync({ id, request }).then(() => undefined)
                  }
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onReceiptUpload={(id, file) =>
                    receiptMutation.mutateAsync({ id, file }).then(() => undefined)
                  }
                  onPhotosUpload={(id, files) =>
                    photosMutation.mutateAsync({ id, files }).then(() => undefined)
                  }
                />
              ))}
            </div>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">{t('empty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
