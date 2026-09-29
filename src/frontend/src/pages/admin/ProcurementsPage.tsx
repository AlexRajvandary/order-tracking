import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, ImagePlus, Save, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as procurementsApi from '@/features/procurements/api/procurementsApi'
import type {
  ArrivalStatus,
  ProcurementAttachment,
  ProcurementRow,
  PurchaseStatus,
  ShipmentStatus,
  UpdateProcurementRequest,
  WarehouseCondition,
} from '@/features/procurements/types'
import { ApiError } from '@/shared/api/client'
import { authorizedRequest } from '@/shared/api/authorizedClient'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'

const purchaseStatuses: PurchaseStatus[] = ['Pending', 'Purchased', 'Error']
const arrivalStatuses: ArrivalStatus[] = ['Pending', 'InTransit', 'Received']
const shipmentStatuses: ShipmentStatus[] = ['AwaitingShipment', 'Shipped', 'Delivered']
const warehouseConditions: WarehouseCondition[] = ['Ok', 'Good', 'Damaged']
const autoSaveDelayMs = 650

function emptyToNull(value: string) {
  return value === '' ? null : value
}

function numberOrNull(value: string) {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
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

function formsEqual(left: UpdateProcurementRequest, right: UpdateProcurementRequest) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function Field({ label, children, className = '' }: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block min-w-0 space-y-1 ${className}`}>
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
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
      <SelectTrigger className="h-9 w-full">
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

function SuffixInput({ suffix, ...props }: React.ComponentProps<typeof Input> & { suffix: string }) {
  return (
    <div className="relative">
      <Input {...props} className={`h-9 pr-12 ${props.className ?? ''}`} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
        {suffix}
      </span>
    </div>
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
    <Button asChild variant="outline" size="sm" className="h-9 cursor-pointer font-normal" aria-disabled={disabled}>
      <label>
        <ImagePlus />
        <span className="max-w-40 truncate">{label}</span>
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

function PhotoThumbnail({ attachment }: { attachment: ProcurementAttachment }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    void authorizedRequest(attachment.url)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load attachment')
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.id, attachment.url])

  return src ? (
    <a href={src} target="_blank" rel="noreferrer" className="shrink-0">
      <img
        src={src}
        alt={attachment.fileName ?? ''}
        className="size-9 rounded-md border object-cover hover:opacity-80"
      />
    </a>
  ) : (
    <div className="size-9 animate-pulse rounded-md border bg-muted" />
  )
}

function ActionButton({ label, children, ...props }: React.ComponentProps<typeof Button> & {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ProcurementCard({
  row,
  deleting,
  uploading,
  onSave,
  onDelete,
  onReceiptUpload,
  onPhotosUpload,
}: {
  row: ProcurementRow
  deleting: boolean
  uploading: boolean
  onSave: (id: string, request: UpdateProcurementRequest) => Promise<ProcurementRow>
  onDelete: (id: string) => void
  onReceiptUpload: (id: string, file: File) => Promise<void>
  onPhotosUpload: (id: string, files: File[]) => Promise<void>
}) {
  const { t } = useTranslation('procurements')
  const initialForm = createForm(row)
  const [form, setForm] = useState<UpdateProcurementRequest>(initialForm)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const formRef = useRef(form)
  const savedRef = useRef(initialForm)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sequenceRef = useRef(0)
  const attachments = row.attachments ?? []
  const receipt = attachments.find((value) => value.kind === 'Receipt')
  const warehousePhotos = attachments.filter((value) => value.kind === 'WarehousePhoto')

  const updateForm = (updater: (value: UpdateProcurementRequest) => UpdateProcurementRequest) => {
    sequenceRef.current += 1
    setSaveState('idle')
    setForm((current) => {
      const next = updater(current)
      formRef.current = next
      return next
    })
  }

  const persist = useCallback(async (snapshot: UpdateProcurementRequest) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (formsEqual(snapshot, savedRef.current)) return

    const sequence = ++sequenceRef.current
    setSaveState('saving')
    try {
      const updated = await onSave(row.id, snapshot)
      if (sequence !== sequenceRef.current) return

      const saved = createForm(updated)
      savedRef.current = saved
      if (formsEqual(formRef.current, snapshot)) {
        formRef.current = saved
        setForm(saved)
      }
      setSaveState('saved')
    } catch {
      if (sequence === sequenceRef.current) setSaveState('error')
    }
  }, [onSave, row.id])

  useEffect(() => {
    if (formsEqual(form, savedRef.current)) return
    timerRef.current = setTimeout(() => void persist(form), autoSaveDelayMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [form, persist])

  const reset = () => {
    sequenceRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    const saved = savedRef.current
    formRef.current = saved
    setForm(saved)
    setSaveState('idle')
  }

  const busy = saveState === 'saving' || deleting || uploading
  const legacyCondition = form.warehouseCondition
    && !warehouseConditions.includes(form.warehouseCondition)
    ? form.warehouseCondition
    : null

  return (
    <article className="overflow-hidden rounded-xl border bg-background">
      <div className="grid grid-cols-1 md:min-w-[1100px] md:grid-cols-[120px_180px_minmax(0,1fr)]">
        <div className="p-3">
          <div className="mb-1 text-xs font-medium text-muted-foreground">{t('request')}</div>
          <Link to={`/admin/orders/${row.orderId}`} className="font-mono text-sm font-semibold text-primary hover:underline">
            {row.trackingCode}
          </Link>
        </div>

        <div className="min-w-0 border-t p-3 md:border-l md:border-t-0">
          <div className="mb-1 text-xs font-medium text-muted-foreground">{t('item')}</div>
          <p className="break-words text-sm font-medium">{row.itemName}</p>
          {row.productUrl ? (
            <a href={row.productUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              {t('source')} <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>

        <section className="border-t p-3 md:border-l md:border-t-0">
          <h2 className="mb-3 text-sm font-semibold">{t('purchase')}</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <Field label={t('fields.purchaseUrl')}>
              <Input className="h-9" type="url" value={form.purchaseUrl ?? ''} onChange={(event) => updateForm((value) => ({ ...value, purchaseUrl: emptyToNull(event.target.value) }))} />
            </Field>
            <Field label={t('fields.purchaseStatus')}>
              <StatusSelect value={form.purchaseStatus} values={purchaseStatuses} group="purchase" onChange={(purchaseStatus) => updateForm((value) => ({ ...value, purchaseStatus: purchaseStatus as PurchaseStatus }))} />
            </Field>
            <Field label={t('fields.purchasePrice')}>
              <Input className="h-9" type="number" min="0" step="0.01" value={form.purchasePrice ?? ''} onChange={(event) => updateForm((value) => ({ ...value, purchasePrice: numberOrNull(event.target.value) }))} />
            </Field>
            <Field label={t('fields.sellerOrderNumber')}>
              <Input className="h-9" value={form.sellerOrderNumber ?? ''} onChange={(event) => updateForm((value) => ({ ...value, sellerOrderNumber: emptyToNull(event.target.value) }))} />
            </Field>
          </div>
          <div className="mt-3">
            <FileUploadButton accept="image/*,application/pdf" disabled={uploading} label={uploading ? t('uploading') : receipt?.fileName ? `✓ ${receipt.fileName}` : t('addReceipt')} onFiles={([file]) => void onReceiptUpload(row.id, file).catch(() => undefined)} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 border-t md:min-w-[1100px] md:grid-cols-[35fr_45fr_20fr]">
        <section className="p-3">
          <h2 className="mb-3 text-sm font-semibold">{t('arrival')}</h2>
          <div className="space-y-3">
            <Field label={t('fields.warehouseTrackingNumber')}>
              <Input className="h-9" value={form.warehouseTrackingNumber ?? ''} onChange={(event) => updateForm((value) => ({ ...value, warehouseTrackingNumber: emptyToNull(event.target.value) }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fields.arrivalStatus')}>
                <StatusSelect value={form.arrivalStatus} values={arrivalStatuses} group="arrival" onChange={(arrivalStatus) => updateForm((value) => ({ ...value, arrivalStatus: arrivalStatus as ArrivalStatus }))} />
              </Field>
              <Field label={t('fields.warehouseReceivedAt')}>
                <Input className="h-9" type="date" value={form.warehouseReceivedAt ?? ''} onChange={(event) => updateForm((value) => ({ ...value, warehouseReceivedAt: emptyToNull(event.target.value) }))} />
              </Field>
            </div>
            <div className="space-y-1">
              <span className="block text-xs font-medium text-muted-foreground">{t('fields.warehousePhotos')}</span>
              <div className="flex flex-wrap items-center gap-2">
                <FileUploadButton accept="image/*" multiple disabled={uploading} label={uploading ? t('uploading') : t('addPhotos')} onFiles={(files) => void onPhotosUpload(row.id, files).catch(() => undefined)} />
                {warehousePhotos.map((photo) => <PhotoThumbnail key={photo.id} attachment={photo} />)}
              </div>
            </div>
            <Field label={t('fields.warehouseCondition')}>
              <Select value={form.warehouseCondition ?? 'Unspecified'} onValueChange={(warehouseCondition) => updateForm((value) => ({ ...value, warehouseCondition: warehouseCondition === 'Unspecified' ? null : warehouseCondition as WarehouseCondition }))}>
                <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unspecified">{t('conditions.Unspecified')}</SelectItem>
                  {warehouseConditions.map((condition) => <SelectItem key={condition} value={condition}>{t(`conditions.${condition}`)}</SelectItem>)}
                  {legacyCondition ? <SelectItem value={legacyCondition}>{t(`conditions.${legacyCondition}`)}</SelectItem> : null}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <section className="border-t p-3 md:border-l md:border-t-0">
          <h2 className="mb-3 text-sm font-semibold">{t('shipment')}</h2>
          <div className="space-y-3">
            <Field label={t('fields.shippingTrackingNumber')}>
              <Input className="h-9" value={form.shippingTrackingNumber ?? ''} onChange={(event) => updateForm((value) => ({ ...value, shippingTrackingNumber: emptyToNull(event.target.value) }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fields.shipmentStatus')}>
                <StatusSelect value={form.shipmentStatus} values={shipmentStatuses} group="shipment" onChange={(shipmentStatus) => updateForm((value) => ({ ...value, shipmentStatus: shipmentStatus as ShipmentStatus }))} />
              </Field>
              <Field label={t('fields.shippingMethod')}>
                <Input className="h-9" value={form.shippingMethod ?? ''} onChange={(event) => updateForm((value) => ({ ...value, shippingMethod: emptyToNull(event.target.value) }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fields.shippingWeight')}>
                <SuffixInput suffix="кг" type="number" min="0" step="0.001" value={form.shippingWeight ?? ''} onChange={(event) => updateForm((value) => ({ ...value, shippingWeight: numberOrNull(event.target.value) }))} />
              </Field>
              <Field label={t('fields.shippingCost')}>
                <SuffixInput suffix="₽" type="number" min="0" step="0.01" value={form.shippingCost ?? ''} onChange={(event) => updateForm((value) => ({ ...value, shippingCost: numberOrNull(event.target.value) }))} />
              </Field>
            </div>
            <Field label={t('fields.shippedAt')} className="max-w-[calc(50%-0.375rem)]">
              <Input className="h-9" type="date" value={form.shippedAt ?? ''} onChange={(event) => updateForm((value) => ({ ...value, shippedAt: emptyToNull(event.target.value) }))} />
            </Field>
          </div>
        </section>

        <section className="border-t p-3 md:border-l md:border-t-0">
          <h2 className="mb-3 text-sm font-semibold">{t('actions')}</h2>
          <TooltipProvider>
            <div className="flex items-center gap-1.5">
              <ActionButton label={t('save')} variant="outline" disabled={busy} onClick={() => void persist(formRef.current)}><Save /></ActionButton>
              <ActionButton label={t('cancel')} variant="ghost" disabled={busy || formsEqual(form, savedRef.current)} onClick={reset}><X /></ActionButton>
              <ActionButton label={t('delete')} variant="destructive" disabled={busy} onClick={() => { if (window.confirm(t('deleteConfirm'))) onDelete(row.id) }}><Trash2 /></ActionButton>
            </div>
          </TooltipProvider>
          <p className={`mt-2 text-xs ${saveState === 'error' ? 'text-destructive' : 'text-muted-foreground'}`} aria-live="polite">
            {saveState === 'saving' ? t('saving') : saveState === 'saved' ? t('saved') : saveState === 'error' ? t('autosaveError') : t('autosaveHint')}
          </p>
        </section>
      </div>
    </article>
  )
}

export function ProcurementsPage() {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const updateRows = useCallback((updater: (rows: ProcurementRow[]) => ProcurementRow[]) => {
    queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows ? updater(rows) : rows)
  }, [queryClient])

  const query = useQuery({
    queryKey: ['procurements'],
    queryFn: ({ signal }) => procurementsApi.getProcurements(signal),
  })

  const saveProcurement = useCallback(async (id: string, request: UpdateProcurementRequest) => {
    try {
      const updated = await procurementsApi.updateProcurement(id, request)
      setError(null)
      updateRows((rows) => rows.map((row) => row.id === updated.id ? updated : row))
      return updated
    } catch (value) {
      setError(value instanceof ApiError ? value.message : t('updateError'))
      throw value
    }
  }, [t, updateRows])

  const deleteMutation = useMutation({
    mutationFn: procurementsApi.deleteProcurement,
    onSuccess: (_, id) => {
      setError(null)
      updateRows((rows) => rows.filter((row) => row.id !== id))
    },
    onError: (value: unknown) => setError(value instanceof ApiError ? value.message : t('deleteError')),
  })

  const receiptMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => procurementsApi.uploadReceipt(id, file),
    onSuccess: (receipt, { id }) => {
      setError(null)
      updateRows((rows) => rows.map((row) => row.id === id ? { ...row, attachments: [...(row.attachments ?? []).filter((value) => value.kind !== 'Receipt'), receipt] } : row))
    },
    onError: (value: unknown) => setError(value instanceof ApiError ? value.message : t('uploadError')),
  })

  const photosMutation = useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) => procurementsApi.uploadWarehousePhotos(id, files),
    onSuccess: (photos, { id }) => {
      setError(null)
      updateRows((rows) => rows.map((row) => row.id === id ? { ...row, attachments: [...(row.attachments ?? []), ...photos] } : row))
    },
    onError: (value: unknown) => setError(value instanceof ApiError ? value.message : t('uploadError')),
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

      <Card className="overflow-hidden border-border shadow-none">
        <CardHeader className="sr-only"><CardTitle>{t('title')}</CardTitle></CardHeader>
        <CardContent className="bg-muted/20 p-3">
          {query.isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
          ) : query.isError ? (
            <div className="space-y-3 p-3">
              <Alert variant="destructive"><AlertDescription>{t('error', { ns: 'common' })}</AlertDescription></Alert>
              <Button variant="outline" onClick={() => void query.refetch()}>{t('retry', { ns: 'common' })}</Button>
            </div>
          ) : query.data?.length ? (
            <div className="space-y-3 overflow-x-auto">
              {query.data.map((row) => (
                <ProcurementCard
                  key={row.id}
                  row={row}
                  deleting={deleteMutation.isPending && deleteMutation.variables === row.id}
                  uploading={(receiptMutation.isPending && receiptMutation.variables?.id === row.id) || (photosMutation.isPending && photosMutation.variables?.id === row.id)}
                  onSave={saveProcurement}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onReceiptUpload={(id, file) => receiptMutation.mutateAsync({ id, file }).then(() => undefined)}
                  onPhotosUpload={(id, files) => photosMutation.mutateAsync({ id, files }).then(() => undefined)}
                />
              ))}
            </div>
          ) : (
            <p className="p-3 text-sm text-muted-foreground">{t('empty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
