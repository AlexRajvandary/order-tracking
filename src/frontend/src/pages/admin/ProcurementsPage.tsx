import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  ImagePlus,
  Package,
  Plane,
  Search,
  Send,
  ShoppingBasket,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as procurementsApi from '@/features/procurements/api/procurementsApi'
import type {
  ArrivalStatus,
  ProcurementAttachment,
  ProcurementCurrencyCode,
  ProcurementRow,
  PurchaseStatus,
  ShipmentStatus,
  UpdateProcurementRequest,
} from '@/features/procurements/types'
import { ApiError } from '@/shared/api/client'
import { authorizedRequest } from '@/shared/api/authorizedClient'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/accordion'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'

const purchaseStatuses: PurchaseStatus[] = ['Pending', 'Purchased', 'Error']
const arrivalStatuses: ArrivalStatus[] = ['Pending', 'InTransit', 'Received']
const shipmentStatuses: ShipmentStatus[] = ['AwaitingShipment', 'Shipped', 'Delivered']
const currencies: ProcurementCurrencyCode[] = ['JPY', 'RUB', 'USD', 'EUR']
const currencySymbols: Record<ProcurementCurrencyCode, string> = { JPY: '¥', RUB: '₽', USD: '$', EUR: '€' }
const mobileFilters: MobileFilter[] = ['all', 'awaitingPurchase', 'purchased', 'warehouseTransit', 'warehouse', 'awaitingShipment', 'shipped']
const autoSaveDelayMs = 650

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type MobileFilter = 'all' | 'awaitingPurchase' | 'purchased' | 'warehouseTransit' | 'warehouse' | 'awaitingShipment' | 'shipped'
type SortOrder = 'newest' | 'oldest'
type UpdateForm = (updater: (value: UpdateProcurementRequest) => UpdateProcurementRequest) => void

function emptyToNull(value: string) {
  return value === '' ? null : value
}

function numberOrNull(value: string) {
  if (value === '') return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function createForm(row: ProcurementRow): UpdateProcurementRequest {
  return {
    purchaseUrl: row.purchaseUrl,
    purchaseStatus: row.purchaseStatus,
    purchasePrice: row.purchasePrice ?? null,
    purchaseCurrencyCode: row.purchaseCurrencyCode ?? 'JPY',
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
    shippingCurrencyCode: row.shippingCurrencyCode ?? 'JPY',
    shippedAt: row.shippedAt ?? null,
  }
}

function formsEqual(left: UpdateProcurementRequest, right: UpdateProcurementRequest) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function useProcurementForm(
  row: ProcurementRow,
  onSave: (id: string, request: UpdateProcurementRequest) => Promise<ProcurementRow>,
) {
  const initialForm = createForm(row)
  const [form, setForm] = useState(initialForm)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const formRef = useRef(form)
  const savedRef = useRef(initialForm)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sequenceRef = useRef(0)

  const updateForm: UpdateForm = (updater) => {
    sequenceRef.current += 1
    setSaveState('idle')
    setForm((current) => {
      const next = updater(current)
      formRef.current = next
      return next
    })
  }

  const persist = useCallback(async (snapshot = formRef.current) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (formsEqual(snapshot, savedRef.current)) return true

    const sequence = ++sequenceRef.current
    setSaveState('saving')
    try {
      const updated = await onSave(row.id, snapshot)
      if (sequence !== sequenceRef.current) return true

      const saved = createForm(updated)
      savedRef.current = saved
      if (formsEqual(formRef.current, snapshot)) {
        formRef.current = saved
        setForm(saved)
      }
      setSaveState('saved')
      return true
    } catch {
      if (sequence === sequenceRef.current) setSaveState('error')
      return false
    }
  }, [onSave, row.id])

  useEffect(() => {
    if (formsEqual(form, savedRef.current)) return
    timerRef.current = setTimeout(() => void persist(form), autoSaveDelayMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [form, persist])

  const reset = useCallback(() => {
    sequenceRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    formRef.current = savedRef.current
    setForm(savedRef.current)
    setSaveState('idle')
  }, [])

  return {
    form,
    updateForm,
    persist,
    reset,
    dirty: !formsEqual(form, savedRef.current),
    saving: saveState === 'saving',
    saveState,
  }
}

function FormField({ label, controlId, children, className = '' }: {
  label: string
  controlId: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <Label htmlFor={controlId} className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function StatusSelect({
  id,
  value,
  values,
  group,
  mobile,
  onChange,
}: {
  id: string
  value: string
  values: string[]
  group: 'purchase' | 'arrival' | 'shipment'
  mobile: boolean
  onChange: (value: string) => void
}) {
  const { t } = useTranslation('procurements')
  const completed = value === 'Purchased' || value === 'Received' || value === 'Shipped' || value === 'Delivered'
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={`${mobile ? 'h-11 text-base' : 'h-9 text-sm'} w-full min-w-0 ${completed ? 'bg-emerald-50' : 'bg-white'}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((status) => (
          <SelectItem key={status} value={status}>{t(`statuses.${group}.${status}`)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SuffixInput({ suffix, mobile, ...props }: React.ComponentProps<typeof Input> & { suffix: string; mobile: boolean }) {
  return (
    <div className="relative">
      <Input {...props} className={`${mobile ? 'h-11 text-base' : 'h-9'} bg-white pr-12 ${props.className ?? ''}`} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{suffix}</span>
    </div>
  )
}

function MoneyInput({ id, value, currency, mobile, onValueChange, onCurrencyChange }: {
  id: string
  value: number | null
  currency: ProcurementCurrencyCode
  mobile: boolean
  onValueChange: (value: number | null) => void
  onCurrencyChange: (value: ProcurementCurrencyCode) => void
}) {
  const height = mobile ? 'h-11 text-base' : 'h-9'
  return (
    <div className="flex min-w-0">
      <Input id={id} className={`${height} min-w-0 rounded-r-none bg-white`} inputMode="decimal" value={value ?? ''} onChange={(event) => onValueChange(numberOrNull(event.target.value))} />
      <Select value={currency} onValueChange={(value) => onCurrencyChange(value as ProcurementCurrencyCode)}>
        <SelectTrigger aria-label="Валюта" className={`${height} w-[92px] shrink-0 rounded-l-none border-l-0 px-2`}><SelectValue /></SelectTrigger>
        <SelectContent>
          {currencies.map((code) => <SelectItem key={code} value={code}>{currencySymbols[code]} {code}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function FileUploadButton({
  accept,
  multiple,
  disabled,
  label,
  mobile,
  onFiles,
}: {
  accept?: string
  multiple?: boolean
  disabled: boolean
  label: string
  mobile: boolean
  onFiles: (files: File[]) => void
}) {
  return (
    <Button asChild variant="outline" size="sm" className={`${mobile ? 'h-11' : 'h-9'} cursor-pointer font-normal`} aria-disabled={disabled}>
      <label>
        <ImagePlus />
        <span className="max-w-44 truncate">{label}</span>
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

function useAttachmentUrl(attachment: ProcurementAttachment) {
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

  return src
}

function AttachmentThumbnail({
  attachment,
  size = 'small',
  deleting,
  onDelete,
}: {
  attachment: ProcurementAttachment
  size?: 'small' | 'photo' | 'desktop' | 'mobile'
  deleting?: boolean
  onDelete?: () => void
}) {
  const src = useAttachmentUrl(attachment)
  const image = attachment.contentType.startsWith('image/')
  const dimensions = size === 'mobile' ? 'size-16' : size === 'desktop' ? 'size-14 2xl:size-16' : size === 'photo' ? 'size-11 xl:size-12 2xl:size-14' : 'size-9'

  return (
    <div className="relative shrink-0">
      {src && image ? (
        <a href={src} target="_blank" rel="noreferrer">
          <img src={src} alt={attachment.fileName ?? ''} className={`${dimensions} rounded-md border object-cover`} />
        </a>
      ) : (
        <div className={`${dimensions} flex items-center justify-center rounded-md border bg-muted`}>
          {src ? <FileText className="size-5 text-muted-foreground" /> : <Skeleton className="size-full" />}
        </div>
      )}
      {onDelete ? (
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          className="absolute -right-2 -top-2 size-7 rounded-full"
          disabled={deleting}
          aria-label="Удалить фотографию"
          onClick={onDelete}
        >
          <X />
        </Button>
      ) : null}
    </div>
  )
}

type FieldsProps = {
  row: ProcurementRow
  form: UpdateProcurementRequest
  updateForm: UpdateForm
  mobile: boolean
  uploading: boolean
  deletingAttachmentId?: string
  onReceiptUpload: (id: string, file: File) => Promise<void>
  onPhotosUpload: (id: string, files: File[]) => Promise<void>
  onDeleteAttachment: (id: string, attachmentId: string) => Promise<void>
}

function PurchaseFields({ row, form, updateForm, mobile, uploading, deletingAttachmentId, onReceiptUpload, onDeleteAttachment }: FieldsProps) {
  const { t } = useTranslation('procurements')
  const prefix = useId()
  const receipt = (row.attachments ?? []).find((value) => value.kind === 'Receipt')
  const inputClass = mobile ? 'h-11 bg-white text-base' : 'h-9 bg-white text-sm'

  return (
    <div className={mobile ? 'space-y-4' : 'space-y-2.5'}>
      <FormField label={t('fields.purchaseUrl')} controlId={`${prefix}-url`}>
        <div className="relative">
          <Input id={`${prefix}-url`} className={`${inputClass} pr-11`} type="url" value={form.purchaseUrl ?? ''} onChange={(event) => updateForm((value) => ({ ...value, purchaseUrl: emptyToNull(event.target.value) }))} />
          {form.purchaseUrl ? <a href={form.purchaseUrl} target="_blank" rel="noreferrer" aria-label="Открыть ссылку" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"><ExternalLink className="size-4" /></a> : null}
        </div>
      </FormField>
      <div className={mobile ? 'grid grid-cols-2 gap-3 max-[379px]:grid-cols-1' : 'space-y-2.5'}>
        <FormField label={t('fields.purchaseStatus')} controlId={`${prefix}-status`}>
          <StatusSelect id={`${prefix}-status`} mobile={mobile} value={form.purchaseStatus} values={purchaseStatuses} group="purchase" onChange={(purchaseStatus) => updateForm((value) => ({ ...value, purchaseStatus: purchaseStatus as PurchaseStatus }))} />
        </FormField>
        <FormField label={t('fields.purchasePrice')} controlId={`${prefix}-price`}>
          <MoneyInput id={`${prefix}-price`} mobile={mobile} value={form.purchasePrice} currency={form.purchaseCurrencyCode} onValueChange={(purchasePrice) => updateForm((value) => ({ ...value, purchasePrice }))} onCurrencyChange={(purchaseCurrencyCode) => updateForm((value) => ({ ...value, purchaseCurrencyCode }))} />
        </FormField>
      </div>
      <div className="min-w-0 space-y-2">
        <Label className="text-sm text-muted-foreground">{t('fields.receipt')}</Label>
        {receipt && mobile ? (
          <div className="flex items-center gap-3 rounded-lg border p-2">
            <AttachmentThumbnail attachment={receipt} size="mobile" deleting={deletingAttachmentId === receipt.id} onDelete={() => void onDeleteAttachment(row.id, receipt.id)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{receipt.fileName ?? t('fields.receipt')}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(receipt.sizeBytes)}</p>
            </div>
          </div>
        ) : null}
        {mobile ? (
          <FileUploadButton accept="image/*,application/pdf" disabled={uploading} mobile label={uploading ? t('uploading') : receipt ? t('replaceReceipt') : t('addReceipt')} onFiles={([file]) => void onReceiptUpload(row.id, file).catch(() => undefined)} />
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            {receipt ? <AttachmentThumbnail attachment={receipt} size="desktop" deleting={deletingAttachmentId === receipt.id} onDelete={() => void onDeleteAttachment(row.id, receipt.id)} /> : null}
            <FileUploadButton accept="image/*,application/pdf" disabled={uploading} mobile={false} label={uploading ? t('uploading') : receipt ? t('replaceReceipt') : t('addReceipt')} onFiles={([file]) => void onReceiptUpload(row.id, file).catch(() => undefined)} />
          </div>
        )}
      </div>
    </div>
  )
}

function CopyInput({ id, value, mobile, onChange }: { id: string; value: string; mobile: boolean; onChange: (value: string) => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="relative">
      <Input id={id} className={`${mobile ? 'h-11 text-base' : 'h-9 text-sm'} bg-white pr-11`} value={value} onChange={(event) => onChange(event.target.value)} />
      {value ? (
        <Button type="button" variant="ghost" size="icon-sm" className={`${mobile ? 'size-11' : 'size-9'} absolute right-0 top-0`} aria-label="Скопировать трек-номер" onClick={() => void copy()}>
          {copied ? <Check /> : <Copy />}
        </Button>
      ) : null}
    </div>
  )
}

function WarehouseFields({ row, form, updateForm, mobile, uploading, deletingAttachmentId, onPhotosUpload, onDeleteAttachment }: FieldsProps) {
  const { t } = useTranslation('procurements')
  const prefix = useId()
  const photos = (row.attachments ?? []).filter((value) => value.kind === 'WarehousePhoto')

  return (
    <div className={mobile ? 'space-y-4' : 'space-y-2.5'}>
      <FormField label={t('fields.warehouseTrackingNumber')} controlId={`${prefix}-tracking`}>
        <CopyInput id={`${prefix}-tracking`} mobile={mobile} value={form.warehouseTrackingNumber ?? ''} onChange={(warehouseTrackingNumber) => updateForm((value) => ({ ...value, warehouseTrackingNumber: emptyToNull(warehouseTrackingNumber) }))} />
      </FormField>
      <div className={mobile ? 'grid grid-cols-2 gap-3 max-[379px]:grid-cols-1' : 'space-y-2.5'}>
        <FormField label={t('fields.arrivalStatus')} controlId={`${prefix}-status`}>
          <StatusSelect id={`${prefix}-status`} mobile={mobile} value={form.arrivalStatus} values={arrivalStatuses} group="arrival" onChange={(arrivalStatus) => updateForm((value) => ({ ...value, arrivalStatus: arrivalStatus as ArrivalStatus }))} />
        </FormField>
        <FormField label={t('fields.warehouseReceivedAt')} controlId={`${prefix}-date`}>
          <Input id={`${prefix}-date`} className={mobile ? 'h-11 bg-white text-base' : 'h-9 bg-white text-sm'} type="date" value={form.warehouseReceivedAt ?? ''} onChange={(event) => updateForm((value) => ({ ...value, warehouseReceivedAt: emptyToNull(event.target.value) }))} />
        </FormField>
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">{t('fields.warehousePhotos')}</Label>
        {mobile ? (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.map((photo) => <AttachmentThumbnail key={photo.id} attachment={photo} size="mobile" deleting={deletingAttachmentId === photo.id} onDelete={() => void onDeleteAttachment(row.id, photo.id)} />)}
            <label className="flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground active:bg-muted" aria-label="Добавить фото">
              <ImagePlus className="size-5" />
              <input type="file" className="sr-only" accept="image/*" multiple disabled={uploading} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; if (files.length) void onPhotosUpload(row.id, files).catch(() => undefined) }} />
            </label>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            {photos.slice(0, 3).map((photo) => <AttachmentThumbnail key={photo.id} attachment={photo} size="photo" deleting={deletingAttachmentId === photo.id} onDelete={() => void onDeleteAttachment(row.id, photo.id)} />)}
            {photos.length > 3 ? <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted text-xs font-medium xl:size-12 2xl:size-14">+{photos.length - 3}</div> : null}
            <label className="flex size-11 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-white text-center text-[9px] leading-tight text-muted-foreground hover:bg-muted/50 xl:size-12 2xl:size-14">
              <ImagePlus className="mb-1 size-4" />
              <span>{uploading ? t('uploading') : t('addPhotos')}</span>
              <input type="file" className="sr-only" accept="image/*" multiple disabled={uploading} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; if (files.length) void onPhotosUpload(row.id, files).catch(() => undefined) }} />
            </label>
          </div>
        )}
      </div>
    </div>
  )
}

function ShippingFields({ form, updateForm, mobile }: FieldsProps) {
  const { t } = useTranslation('procurements')
  const prefix = useId()
  const inputClass = mobile ? 'h-11 bg-white text-base' : 'h-9 bg-white text-sm'

  return (
    <div className={mobile ? 'space-y-4' : 'space-y-2.5'}>
      <FormField label={t('fields.shippingTrackingNumber')} controlId={`${prefix}-tracking`}>
        <CopyInput id={`${prefix}-tracking`} mobile={mobile} value={form.shippingTrackingNumber ?? ''} onChange={(shippingTrackingNumber) => updateForm((value) => ({ ...value, shippingTrackingNumber: emptyToNull(shippingTrackingNumber) }))} />
      </FormField>
      <div className="grid grid-cols-2 gap-3 max-[379px]:grid-cols-1">
        <FormField label={t('fields.shipmentStatus')} controlId={`${prefix}-status`}>
          <StatusSelect id={`${prefix}-status`} mobile={mobile} value={form.shipmentStatus} values={shipmentStatuses} group="shipment" onChange={(shipmentStatus) => updateForm((value) => ({ ...value, shipmentStatus: shipmentStatus as ShipmentStatus }))} />
        </FormField>
        <FormField label={t('fields.shippingMethod')} controlId={`${prefix}-method`}>
          <Input id={`${prefix}-method`} className={inputClass} value={form.shippingMethod ?? ''} onChange={(event) => updateForm((value) => ({ ...value, shippingMethod: emptyToNull(event.target.value) }))} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3 max-[379px]:grid-cols-1">
        <FormField label={t('fields.shippingWeight')} controlId={`${prefix}-weight`}>
          <SuffixInput id={`${prefix}-weight`} mobile={mobile} suffix="кг" inputMode="decimal" value={form.shippingWeight ?? ''} onChange={(event) => updateForm((value) => ({ ...value, shippingWeight: numberOrNull(event.target.value) }))} />
        </FormField>
        <FormField label={t('fields.shippingCost')} controlId={`${prefix}-cost`}>
          <MoneyInput id={`${prefix}-cost`} mobile={mobile} value={form.shippingCost} currency={form.shippingCurrencyCode} onValueChange={(shippingCost) => updateForm((value) => ({ ...value, shippingCost }))} onCurrencyChange={(shippingCurrencyCode) => updateForm((value) => ({ ...value, shippingCurrencyCode }))} />
        </FormField>
      </div>
      <FormField label={t('fields.shippedAt')} controlId={`${prefix}-date`} className={mobile ? '' : 'max-w-[calc(50%-0.375rem)]'}>
        <Input id={`${prefix}-date`} className={inputClass} type="date" value={form.shippedAt ?? ''} onChange={(event) => updateForm((value) => ({ ...value, shippedAt: emptyToNull(event.target.value) }))} />
      </FormField>
    </div>
  )
}

function ActionButton({ label, children, ...props }: React.ComponentProps<typeof Button> & { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><Button size="icon-sm" aria-label={label} {...props}>{children}</Button></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function SaveStateText({ state, dirty }: { state: SaveState; dirty: boolean }) {
  const { t } = useTranslation('procurements')
  const key = state === 'saving' ? 'saving' : state === 'error' ? 'autosaveError' : dirty ? 'unsaved' : 'saved'
  return <span className={state === 'error' ? 'text-destructive' : 'text-muted-foreground'}>{t(key)}</span>
}

type EditorProps = {
  row: ProcurementRow
  uploading: boolean
  deletingAttachmentId?: string
  onSave: (id: string, request: UpdateProcurementRequest) => Promise<ProcurementRow>
  onReceiptUpload: (id: string, file: File) => Promise<void>
  onPhotosUpload: (id: string, files: File[]) => Promise<void>
  onDeleteAttachment: (id: string, attachmentId: string) => Promise<void>
}

function DesktopProcurementEditor(props: EditorProps) {
  const { t } = useTranslation('procurements')
  const state = useProcurementForm(props.row, props.onSave)
  const busy = state.saving || props.uploading
  const fieldProps: FieldsProps = { ...props, form: state.form, updateForm: state.updateForm, mobile: false }

  return (
    <article className="grid w-full max-w-full grid-cols-[minmax(0,7fr)_minmax(0,12fr)_minmax(0,24fr)_minmax(0,25fr)_minmax(0,24fr)_minmax(0,8fr)] border-t first:border-t-0">
      <div className="min-w-0 p-2.5 2xl:p-3">
        <Link to={`/admin/orders/${props.row.orderId}`} className="break-all font-mono text-sm font-semibold text-primary hover:underline">{props.row.trackingCode}</Link>
      </div>
      <div className="min-w-0 border-l p-2.5 2xl:p-3">
        {props.row.productImageUrl ? <img src={props.row.productImageUrl} alt="" className="mb-2 aspect-square w-full max-w-[76px] rounded-lg bg-muted object-cover 2xl:max-w-[90px]" /> : <div className="mb-2 flex aspect-square w-full max-w-[76px] items-center justify-center rounded-lg bg-muted 2xl:max-w-[90px]"><Package className="size-6 text-muted-foreground" /></div>}
        <p className="line-clamp-2 text-xs font-medium 2xl:text-sm">{props.row.itemName}</p>
        {props.row.productUrl ? <a href={props.row.productUrl} target="_blank" rel="noreferrer" className="mt-1 flex max-w-full min-w-0 items-center gap-1 text-xs text-primary hover:underline"><span className="truncate">{props.row.productUrl}</span><ExternalLink className="size-3 shrink-0" /></a> : null}
      </div>
      <section className="min-w-0 border-l bg-blue-50/35 p-2.5 2xl:p-3"><PurchaseFields {...fieldProps} /></section>
      <section className="min-w-0 border-l bg-amber-50/25 p-2.5 2xl:p-3"><WarehouseFields {...fieldProps} /></section>
      <section className="min-w-0 border-l bg-violet-50/30 p-2.5 2xl:p-3"><ShippingFields {...fieldProps} /></section>
      <section className="min-w-0 border-l p-2.5 2xl:p-3">
        <TooltipProvider><div className="flex flex-wrap items-center gap-1"><ActionButton label={t('cancel')} variant="ghost" disabled={busy || !state.dirty} onClick={state.reset}><X /></ActionButton></div></TooltipProvider>
        <p className="mt-2 break-words text-[10px] 2xl:text-xs" aria-live="polite"><SaveStateText state={state.saveState} dirty={state.dirty} /></p>
      </section>
    </article>
  )
}

function OrderStatusBadge({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const status = getDisplayStatus(row)
  const classes = {
    awaiting: 'border-amber-200 bg-amber-50 text-amber-700',
    purchased: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warehouse: 'border-blue-200 bg-blue-50 text-blue-700',
    shipped: 'border-violet-200 bg-violet-50 text-violet-700',
    error: 'border-red-200 bg-red-50 text-red-700',
  }[status]
  return <Badge variant="outline" className={classes}>{t(`mobile.status.${status}`)}</Badge>
}

function getDisplayStatus(row: ProcurementRow) {
  if (row.purchaseStatus === 'Error') return 'error' as const
  if (row.shipmentStatus === 'Shipped' || row.shipmentStatus === 'Delivered') return 'shipped' as const
  if (row.arrivalStatus === 'Received') return 'warehouse' as const
  if (row.purchaseStatus === 'Purchased') return 'purchased' as const
  return 'awaiting' as const
}

function matchesFilter(row: ProcurementRow, filter: MobileFilter) {
  if (filter === 'all') return true
  if (filter === 'awaitingPurchase') return row.purchaseStatus === 'Pending'
  if (filter === 'purchased') return row.purchaseStatus === 'Purchased'
  if (filter === 'warehouseTransit') return row.purchaseStatus === 'Purchased' && row.arrivalStatus !== 'Received'
  if (filter === 'warehouse') return row.arrivalStatus === 'Received'
  if (filter === 'awaitingShipment') return row.arrivalStatus === 'Received' && row.shipmentStatus === 'AwaitingShipment'
  return row.shipmentStatus === 'Shipped' || row.shipmentStatus === 'Delivered'
}

function MobileListSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex h-24 items-center gap-3 rounded-xl border bg-background p-3"><Skeleton className="size-14 shrink-0" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-3/5" /></div><Skeleton className="h-5 w-16 rounded-full" /></div>)}</div>
}

function MobileDetailsSkeleton() {
  return <div className="space-y-3"><Skeleton className="h-11 w-32" /><div className="flex h-28 gap-3 rounded-xl border bg-background p-3"><Skeleton className="size-[72px] shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div></div>{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-[72px] w-full rounded-xl" />)}</div>
}

function ProductPlaceholder({ large = false }: { large?: boolean }) {
  return <div className={`${large ? 'size-[72px]' : 'size-14'} flex shrink-0 items-center justify-center rounded-lg border bg-muted`}><Package className={`${large ? 'size-7' : 'size-5'} text-muted-foreground`} /></div>
}

function MobileOrdersList({
  rows,
  search,
  filter,
  sort,
  onSearch,
  onFilter,
  onSort,
  onOpen,
}: {
  rows: ProcurementRow[]
  search: string
  filter: MobileFilter
  sort: SortOrder
  onSearch: (value: string) => void
  onFilter: (value: MobileFilter) => void
  onSort: (value: SortOrder) => void
  onOpen: (row: ProcurementRow) => void
}) {
  const { t } = useTranslation('procurements')
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase())
  const counts = useMemo(() => Object.fromEntries(mobileFilters.map((key) => [key, rows.filter((row) => matchesFilter(row, key)).length])) as Record<MobileFilter, number>, [rows])
  const visibleRows = useMemo(() => rows
    .filter((row) => matchesFilter(row, filter))
    .filter((row) => !deferredSearch || [row.trackingCode, row.itemName, row.warehouseTrackingNumber, row.shippingTrackingNumber].some((value) => value?.toLocaleLowerCase().includes(deferredSearch)))
    .sort((left, right) => (sort === 'newest' ? -1 : 1) * (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())), [deferredSearch, filter, rows, sort])

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 pl-9 text-base" value={search} placeholder={t('mobile.searchPlaceholder')} onChange={(event) => onSearch(event.target.value)} /></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon-lg" className="size-11" aria-label={t('mobile.sort')}><SlidersHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onSelect={() => onSort('newest')}>{sort === 'newest' ? <Check /> : null}{t('mobile.newest')}</DropdownMenuItem><DropdownMenuItem onSelect={() => onSort('oldest')}>{sort === 'oldest' ? <Check /> : null}{t('mobile.oldest')}</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {mobileFilters.map((key) => <Button key={key} type="button" size="sm" variant={filter === key ? 'default' : 'outline'} className="h-9 shrink-0" onClick={() => onFilter(key)}>{t(`mobile.filters.${key}`)} <Badge variant={filter === key ? 'secondary' : 'outline'} className="ml-1 h-5 px-1.5">{counts[key]}</Badge></Button>)}
      </div>
      {visibleRows.length ? (
        <div className="space-y-2">
          {visibleRows.map((row) => {
            const meta = [formatMoney(row.purchasePrice, row.purchaseCurrencyCode), row.warehouseTrackingNumber ? `${t('mobile.track')}: ${row.warehouseTrackingNumber}` : null].filter(Boolean).join(' · ')
            return <button key={row.id} type="button" className="flex min-h-24 w-full items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors active:bg-muted/70" onClick={() => onOpen(row)}><ProductPlaceholder /><div className="min-w-0 flex-1"><p className="font-mono text-sm font-semibold">{row.trackingCode}</p><p className="mt-1 truncate text-sm">{row.itemName || t('item')}</p><p className="mt-1 truncate text-xs text-muted-foreground">{meta || t('mobile.noDetails')}</p></div><div className="flex shrink-0 items-center gap-1"><OrderStatusBadge row={row} /><ChevronRight className="size-4 text-muted-foreground" /></div></button>
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-xl border bg-background px-4 py-10 text-center"><Search className="mb-3 size-8 text-muted-foreground" /><p className="font-medium">{t('mobile.emptyTitle')}</p><p className="mt-1 text-sm text-muted-foreground">{t('mobile.emptyDescription')}</p></div>
      )}
    </div>
  )
}

function AccordionHeading({ icon, title, badge, summary }: { icon: ReactNode; title: string; badge: ReactNode; summary: string }) {
  return <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-muted-foreground">{icon}</span><span className="font-medium">{title}</span><span className="ml-auto">{badge}</span></div><p className="mt-1 truncate pr-2 text-xs font-normal text-muted-foreground">{summary}</p></div>
}

function summary(parts: Array<string | number | null | undefined>, fallback: string) {
  const result = parts.filter((value) => value !== null && value !== undefined && value !== '').join(' · ')
  return result || fallback
}

function MobileOrderDetails(props: EditorProps & { onBack: () => void }) {
  const { t, i18n } = useTranslation('procurements')
  const state = useProcurementForm(props.row, props.onSave)
  const [accordion, setAccordion] = useState(() => props.row.purchaseStatus !== 'Purchased' ? 'purchase' : props.row.arrivalStatus !== 'Received' ? 'warehouse' : props.row.shipmentStatus === 'AwaitingShipment' ? 'shipping' : '')
  const [exitDialog, setExitDialog] = useState(false)
  const fieldProps: FieldsProps = { ...props, form: state.form, updateForm: state.updateForm, mobile: true }
  const date = new Intl.DateTimeFormat(i18n.language === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(props.row.createdAt))
  const receipt = (props.row.attachments ?? []).find((value) => value.kind === 'Receipt')
  const back = () => state.dirty ? setExitDialog(true) : props.onBack()
  const copyApplication = async () => navigator.clipboard.writeText(props.row.trackingCode)

  const purchaseSummary = summary([formatMoney(state.form.purchasePrice, state.form.purchaseCurrencyCode), receipt ? t('fields.receipt') : null], t('mobile.purchaseEmpty'))
  const warehouseSummary = summary([state.form.warehouseTrackingNumber ? `${t('mobile.track')}: ${state.form.warehouseTrackingNumber}` : null, formatDate(state.form.warehouseReceivedAt)], t('mobile.warehouseEmpty'))
  const shippingSummary = summary([state.form.shippingTrackingNumber, state.form.shippingMethod, state.form.shippingWeight == null ? null : `${state.form.shippingWeight} кг`, formatMoney(state.form.shippingCost, state.form.shippingCurrencyCode)], t('mobile.shippingEmpty'))

  return (
    <div className="min-w-0 pb-4">
      <Button type="button" variant="ghost" className="mb-3 min-h-11 -ml-2 px-2" onClick={back}><ArrowLeft /> {t('mobile.allOrders')}</Button>
      <div className="mb-3 flex min-h-[104px] gap-3 rounded-xl border bg-background p-3">
        <ProductPlaceholder large />
        <div className="min-w-0 flex-1"><p className="line-clamp-2 font-semibold">{props.row.itemName || t('item')}</p>{props.row.productUrl ? <a href={props.row.productUrl} target="_blank" rel="noreferrer" className="mt-1 flex min-w-0 items-center gap-1 text-sm text-muted-foreground"><span className="truncate">{props.row.productUrl}</span><ExternalLink className="size-3.5 shrink-0" /></a> : null}<button type="button" className="mt-1 flex min-h-7 items-center gap-1 text-sm" aria-label="Скопировать номер заявки" onClick={() => void copyApplication()}>{t('request')}: <span className="font-mono font-medium">{props.row.trackingCode}</span><Copy className="size-3.5 text-muted-foreground" /></button><p className="text-xs text-muted-foreground">{date}</p></div>
      </div>

      <Accordion type="single" collapsible value={accordion} onValueChange={setAccordion} className="rounded-xl border bg-background px-4">
        <AccordionItem value="purchase"><AccordionTrigger><AccordionHeading icon={<ShoppingBasket className="size-4" />} title={t('purchase')} badge={<Badge variant="outline">{t(`statuses.purchase.${state.form.purchaseStatus}`)}</Badge>} summary={purchaseSummary} /></AccordionTrigger><AccordionContent><PurchaseFields {...fieldProps} /></AccordionContent></AccordionItem>
        <AccordionItem value="warehouse"><AccordionTrigger><AccordionHeading icon={<Package className="size-4" />} title={t('arrival')} badge={<Badge variant="outline">{t(`statuses.arrival.${state.form.arrivalStatus}`)}</Badge>} summary={warehouseSummary} /></AccordionTrigger><AccordionContent><WarehouseFields {...fieldProps} /></AccordionContent></AccordionItem>
        <AccordionItem value="shipping"><AccordionTrigger><AccordionHeading icon={state.form.shipmentStatus === 'Shipped' || state.form.shipmentStatus === 'Delivered' ? <Plane className="size-4" /> : <Send className="size-4" />} title={t('shipment')} badge={<Badge variant="outline">{t(`statuses.shipment.${state.form.shipmentStatus}`)}</Badge>} summary={shippingSummary} /></AccordionTrigger><AccordionContent><ShippingFields {...fieldProps} /></AccordionContent></AccordionItem>
      </Accordion>
      <p className="mt-3 text-center text-xs" aria-live="polite"><SaveStateText state={state.saveState} dirty={state.dirty} /></p>

      <AlertDialog open={exitDialog} onOpenChange={setExitDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('mobile.unsavedTitle')}</AlertDialogTitle><AlertDialogDescription>{t('mobile.unsavedDescription')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('mobile.continueEditing')}</AlertDialogCancel><AlertDialogAction onClick={() => { state.reset(); setExitDialog(false); props.onBack() }}>{t('mobile.exitWithoutSaving')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return null
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}.${month}.${year}` : value
}

function formatMoney(value: number | null, currency: ProcurementCurrencyCode | null | undefined) {
  if (value == null) return null
  const code = currency ?? 'JPY'
  return `${value.toLocaleString('ru-RU')} ${currencySymbols[code]}`
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export function ProcurementsPage() {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<MobileFilter>('all')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [error, setError] = useState<string | null>(null)
  const scrollPositionRef = useRef(0)

  const updateRows = useCallback((updater: (rows: ProcurementRow[]) => ProcurementRow[]) => {
    queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows ? updater(rows) : rows)
  }, [queryClient])

  const query = useQuery({ queryKey: ['procurements'], queryFn: ({ signal }) => procurementsApi.getProcurements(signal) })

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

  const receiptMutation = useMutation({ mutationFn: ({ id, file }: { id: string; file: File }) => procurementsApi.uploadReceipt(id, file), onSuccess: (receipt, { id }) => { setError(null); updateRows((rows) => rows.map((row) => row.id === id ? { ...row, attachments: [...(row.attachments ?? []).filter((value) => value.kind !== 'Receipt'), receipt] } : row)) }, onError: (value: unknown) => setError(value instanceof ApiError ? value.message : t('uploadError')) })
  const photosMutation = useMutation({ mutationFn: ({ id, files }: { id: string; files: File[] }) => procurementsApi.uploadWarehousePhotos(id, files), onSuccess: (photos, { id }) => { setError(null); updateRows((rows) => rows.map((row) => row.id === id ? { ...row, attachments: [...(row.attachments ?? []), ...photos] } : row)) }, onError: (value: unknown) => setError(value instanceof ApiError ? value.message : t('uploadError')) })
  const attachmentMutation = useMutation({ mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) => procurementsApi.deleteAttachment(id, attachmentId), onSuccess: (_, { id, attachmentId }) => { setError(null); updateRows((rows) => rows.map((row) => row.id === id ? { ...row, attachments: (row.attachments ?? []).filter((value) => value.id !== attachmentId) } : row)) }, onError: (value: unknown) => setError(value instanceof ApiError ? value.message : t('uploadError')) })

  const rows = query.data ?? []
  const selectedId = searchParams.get('order')
  const selectedRow = rows.find((row) => row.id === selectedId)
  const openOrder = (row: ProcurementRow) => { scrollPositionRef.current = window.scrollY; const next = new URLSearchParams(searchParams); next.set('order', row.id); setSearchParams(next) }
  const closeOrder = () => { const next = new URLSearchParams(searchParams); next.delete('order'); setSearchParams(next); window.requestAnimationFrame(() => window.scrollTo({ top: scrollPositionRef.current })) }
  const sharedMutations = (row: ProcurementRow): Omit<EditorProps, 'row'> => ({
    uploading: (receiptMutation.isPending && receiptMutation.variables?.id === row.id) || (photosMutation.isPending && photosMutation.variables?.id === row.id),
    deletingAttachmentId: attachmentMutation.isPending && attachmentMutation.variables?.id === row.id ? attachmentMutation.variables.attachmentId : undefined,
    onSave: saveProcurement,
    onReceiptUpload: (id, file) => receiptMutation.mutateAsync({ id, file }).then(() => undefined),
    onPhotosUpload: (id, files) => photosMutation.mutateAsync({ id, files }).then(() => undefined),
    onDeleteAttachment: (id, attachmentId) => attachmentMutation.mutateAsync({ id, attachmentId }).then(() => undefined),
  })

  if (isMobile) {
    return (
      <div className="min-w-0 overflow-x-hidden">
        {error ? <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {query.isLoading ? selectedId ? <MobileDetailsSkeleton /> : <><h1 className="mb-4 text-2xl font-bold">{t('title')}</h1><MobileListSkeleton /></> : query.isError ? <div className="rounded-xl border p-6 text-center"><p className="font-medium">{t('mobile.loadError')}</p><Button variant="outline" className="mt-3" onClick={() => void query.refetch()}>{t('retry', { ns: 'common' })}</Button></div> : selectedRow ? <MobileOrderDetails key={selectedRow.id} row={selectedRow} {...sharedMutations(selectedRow)} onBack={closeOrder} /> : <MobileOrdersList rows={rows} search={search} filter={filter} sort={sort} onSearch={setSearch} onFilter={setFilter} onSort={setSort} onOpen={openOrder} />}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <Card className="w-full max-w-full gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white py-0 shadow-none ring-0">
        <CardHeader className="sr-only"><CardTitle>{t('title')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? <p className="p-3 text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p> : query.isError ? <div className="space-y-3 p-3"><Alert variant="destructive"><AlertDescription>{t('error', { ns: 'common' })}</AlertDescription></Alert><Button variant="outline" onClick={() => void query.refetch()}>{t('retry', { ns: 'common' })}</Button></div> : rows.length ? (
            <div className="w-full max-w-full overflow-hidden">
              <div className="grid h-11 w-full max-w-full grid-cols-[minmax(0,7fr)_minmax(0,12fr)_minmax(0,24fr)_minmax(0,25fr)_minmax(0,24fr)_minmax(0,8fr)] border-b text-xs font-semibold 2xl:text-sm">
                <div className="flex min-w-0 items-center px-2.5 2xl:px-3">{t('request')}</div>
                <div className="flex min-w-0 items-center border-l px-2.5 2xl:px-3">{t('item')}</div>
                <div className="flex min-w-0 items-center border-l bg-blue-50/35 px-2.5 2xl:px-3">{t('purchase')}</div>
                <div className="flex min-w-0 items-center border-l bg-amber-50/25 px-2.5 2xl:px-3">{t('arrival')}</div>
                <div className="flex min-w-0 items-center border-l bg-violet-50/30 px-2.5 2xl:px-3">{t('shipment')}</div>
                <div className="flex min-w-0 items-center border-l px-2 2xl:px-3">{t('actions')}</div>
              </div>
              {rows.map((row) => <DesktopProcurementEditor key={row.id} row={row} {...sharedMutations(row)} />)}
            </div>
          ) : <p className="p-3 text-sm text-muted-foreground">{t('empty')}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
