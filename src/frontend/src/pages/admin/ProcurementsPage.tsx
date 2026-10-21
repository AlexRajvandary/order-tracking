import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type FocusEvent as ReactFocusEvent,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Archive,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  FileText,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import { enUS, ru } from 'date-fns/locale'
import { endOfDay, startOfDay, subDays, subMonths } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as ordersApi from '@/features/orders/api/ordersApi'
import * as procurementsApi from '@/features/procurements/api/procurementsApi'
import { countOrdersByCreatedDate, countProductsAndDistinctOrders, filterByCreatedAt } from '@/features/procurements/lib/dateFiltering'
import { getNextProcurementActionStatus } from '@/features/procurements/lib/lifecycleActions'
import { ProcurementCommentsChat } from '@/features/procurements/ui/ProcurementCommentsChat'
import type {
  ProcurementAttachment,
  ProcurementCurrencyCode,
  ProcurementStage,
  ProcurementStatus,
  ProcurementRow,
  UpdateProcurementRequest,
} from '@/features/procurements/types'
import { ApiError } from '@/shared/api/client'
import { authorizedRequest } from '@/shared/api/authorizedClient'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Card, CardContent } from '@/shared/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { Calendar } from '@/shared/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

const currencies: ProcurementCurrencyCode[] = ['JPY', 'RUB', 'USD', 'EUR']
const currencySymbols: Record<ProcurementCurrencyCode, string> = { JPY: '¥', RUB: '₽', USD: '$', EUR: '€' }
const stages: Exclude<ProcurementStage, 'archive'>[] = ['purchase', 'originWarehouse', 'transit', 'moscow', 'customerDelivery']
const autoSaveDelayMs = 650

type BoardStage = typeof stages[number]
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type OrderGroup = { orderId: string; trackingCode: string; rows: ProcurementRow[]; stage: BoardStage }
type ActiveProcurementDrag = { rowId: string; sourceStage: BoardStage; allowedStages: BoardStage[]; width: number; offsetX: number }
type TransitionAction = (row: ProcurementRow, status?: ProcurementStatus, stage?: string) => Promise<ProcurementRow> | undefined

function createForm(row: ProcurementRow): UpdateProcurementRequest {
  return {
    purchaseUrl: row.purchaseUrl,
    purchasePrice: row.purchasePrice ?? null,
    purchaseCurrencyCode: row.purchaseCurrencyCode ?? 'JPY',
    sellerOrderNumber: row.sellerOrderNumber ?? null,
    warehouseTrackingNumber: row.warehouseTrackingNumber ?? null,
    warehouseReceivedAt: row.warehouseReceivedAt ?? null,
    warehouseCondition: row.warehouseCondition ?? null,
    shippingTrackingNumber: row.shippingTrackingNumber ?? null,
    shippingMethod: row.shippingMethod ?? null,
    shippingWeight: row.shippingWeight ?? null,
    shippingCost: row.shippingCost ?? null,
    shippingCurrencyCode: row.shippingCurrencyCode ?? 'JPY',
    shippedAt: row.shippedAt ?? null,
  }
}

function deriveItemStage(row: ProcurementRow): BoardStage { return row.stage as BoardStage }

function startItemDrag(
  event: ReactDragEvent<HTMLElement>,
  row: ProcurementRow,
  onDragStart: (drag: ActiveProcurementDrag) => void,
) {
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('button,a,input,textarea,select,[role="menu"],[contenteditable="true"],[data-no-drag]')) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  const dragImage = event.currentTarget.closest<HTMLElement>('[data-procurement-item]') ?? event.currentTarget
  const rect = dragImage.getBoundingClientRect()
  const offsetX = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
  const offsetY = Math.max(0, Math.min(rect.height, event.clientY - rect.top))
  event.dataTransfer.setData('text/plain', row.id)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setDragImage(dragImage, offsetX, offsetY)
  onDragStart({ rowId: row.id, sourceStage: deriveItemStage(row), allowedStages: [...stages], width: rect.width, offsetX })
}

function useColumnDropTarget(activeDrag: ActiveProcurementDrag | null, onMove: (rowId: string, stage: BoardStage) => void) {
  const [dropStage, setDropStage] = useState<BoardStage | null>(null)
  const findTarget = (root: HTMLElement, clientX: number) => {
    if (!activeDrag) return null
    const left = clientX - activeDrag.offsetX
    const right = left + activeDrag.width
    const lanes = Array.from(root.querySelectorAll<HTMLElement>('[data-procurement-stage]'))
    return lanes.map((lane) => {
      const rect = lane.getBoundingClientRect()
      const overlap = Math.max(0, Math.min(right, rect.right) - Math.max(left, rect.left))
      return { stage: lane.dataset.procurementStage as BoardStage, overlap, distance: Math.abs((rect.left + rect.right) / 2 - (left + right) / 2) }
    }).filter((candidate) => candidate.stage !== activeDrag.sourceStage && activeDrag.allowedStages.includes(candidate.stage) && candidate.overlap >= activeDrag.width * 0.25)
      .sort((a, b) => b.overlap - a.overlap || a.distance - b.distance)[0]?.stage ?? null
  }
  const onDragOver = (event: ReactDragEvent<HTMLElement>) => {
    if (!activeDrag) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const next = findTarget(event.currentTarget, event.clientX)
    setDropStage(next)
    if (event.currentTarget.hasAttribute('data-procurement-scroll')) {
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX > rect.right - 36) event.currentTarget.scrollLeft += 12
      else if (event.clientX < rect.left + 36) event.currentTarget.scrollLeft -= 12
    }
  }
  const onDrop = (event: ReactDragEvent<HTMLElement>) => {
    if (!activeDrag) return
    event.preventDefault()
    const target = findTarget(event.currentTarget, event.clientX)
    if (target) onMove(activeDrag.rowId, target)
    setDropStage(null)
  }
  const onDragLeave = (event: ReactDragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropStage(null)
  }
  return { dropStage, onDragOver, onDrop, onDragLeave }
}

function groupOrders(rows: ProcurementRow[], stageOverride?: BoardStage) {
  const grouped = new Map<string, ProcurementRow[]>()
  rows.forEach((row) => grouped.set(row.orderId, [...(grouped.get(row.orderId) ?? []), row]))
  return Array.from(grouped, ([orderId, orderRows]) => {
    const sortedRows = orderRows.toSorted((left, right) => left.sortOrder - right.sortOrder || left.itemName.localeCompare(right.itemName))
    return { orderId, trackingCode: sortedRows[0]?.trackingCode ?? '', rows: sortedRows, stage: stageOverride ?? (sortedRows[0]?.stage as BoardStage) } satisfies OrderGroup
  })
}

function groupsForStage(groups: OrderGroup[], stage: BoardStage): OrderGroup[] {
  return groupOrders(groups.flatMap((group) => group.rows.filter((row) => row.stage === stage)), stage)
}

function filterGroupsByCreatedDate(groups: OrderGroup[], range: DateRange | undefined, stage: BoardStage): OrderGroup[] {
  if (!range?.from && !range?.to) return groups
  const matchingRows = filterByCreatedAt(groups.flatMap((group) => group.rows), range)
  return groupOrders(matchingRows, stage)
}

function matchesSearch(group: OrderGroup, search: string) {
  if (!search) return true
  return group.trackingCode.toLocaleLowerCase().includes(search) || group.rows.some((row) => [
    row.itemName,
    row.itemDescription,
    row.shopName,
    row.productSource,
    row.sellerOrderNumber,
    row.warehouseTrackingNumber,
    row.shippingTrackingNumber,
  ].some((value) => value?.toLocaleLowerCase().includes(search)))
}

function OrderBadge({ group, className }: { group: Pick<OrderGroup, 'orderId' | 'trackingCode'>; className?: string }) {
  return <span className={`block max-w-full truncate text-[11px] font-semibold text-[#111827] ${className ?? ''}`} title={group.trackingCode}>{group.trackingCode}</span>
}

function safeProductUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch { return null }
}

function isUrlLike(value: string | null | undefined) {
  return Boolean(value && (/^https?:\/\//i.test(value) || /^(www\.)?[\w-]+\.[a-z]{2,}(\/|$)/i.test(value)))
}

function productTitle(row: ProcurementRow) {
  if (row.itemName.trim() && !isUrlLike(row.itemName)) return row.itemName.trim()
  if (row.itemDescription?.trim() && !isUrlLike(row.itemDescription)) return row.itemDescription.trim()
  const url = safeProductUrl(row.productUrl) ?? safeProductUrl(row.itemName)
  return url?.hostname.replace(/^www\./, '') ?? row.itemName.trim()
}

function compactProductUrl(value: string) {
  const url = safeProductUrl(value)
  if (!url) return value.length > 36 ? `${value.slice(0, 33)}…` : value
  return `${url.hostname.replace(/^www\./, '')}${url.pathname !== '/' ? '/…' : ''}`
}

function CardMenu({ row, group }: { row: ProcurementRow; group: Pick<OrderGroup, 'trackingCode'> }) {
  const { t } = useTranslation('procurements')
  const url = safeProductUrl(row.productUrl)
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-lg" aria-label={t('board.cardMenu')} title={t('board.cardMenu')} className="size-10 shrink-0 text-[#667085]"><MoreHorizontal className="size-[18px]" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52">
      <DropdownMenuItem onSelect={() => { void navigator.clipboard?.writeText(group.trackingCode).catch(() => undefined) }}><Copy />{t('board.copyOrderNumber')}</DropdownMenuItem>
      <DropdownMenuItem asChild><Link to={`/admin/procurements/items/${row.id}`}><FileText />{t('board.openItem')}</Link></DropdownMenuItem>
      {url ? <DropdownMenuItem asChild><a href={url.href} target="_blank" rel="noopener noreferrer"><ExternalLink />{t('board.openProduct')}</a></DropdownMenuItem> : null}
    </DropdownMenuContent>
  </DropdownMenu>
}

function useProductImageUrl(source: string | null) {
  const [resolved, setResolved] = useState<string | null>(() =>
    source && !source.startsWith('/api/') ? source : null,
  )
  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    if (!source) {
      setResolved(null)
      return
    }
    if (!source.startsWith('/api/')) {
      setResolved(source)
      return
    }
    setResolved(null)
    void authorizedRequest(source)
      .then((response) => {
        if (!response.ok) throw new Error('Image request failed')
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setResolved(objectUrl)
      })
      .catch(() => setResolved(null))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [source])
  return resolved
}

function ProductImage({ row, className = 'size-20' }: { row: ProcurementRow; className?: string }) {
  const src = useProductImageUrl(row.productImageUrl)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return src && !failed
    ? <img src={src} alt={productTitle(row)} onError={() => setFailed(true)} className={`${className} shrink-0 rounded-[6px] border border-[#E5E7EB] bg-[#F3F4F6] object-contain`} />
    : <span aria-label={productTitle(row)} className={`${className} flex shrink-0 items-center justify-center rounded-[6px] border border-[#E5E7EB] bg-[#F3F4F6]`}><ImageOff className="size-6 text-slate-400" /></span>
}

function formatMoney(value: number | null, currency: ProcurementCurrencyCode | null | undefined) {
  if (value == null) return null
  const code = currency ?? 'JPY'
  return `${currencySymbols[code]} ${value.toLocaleString('ru-RU')}`
}

function orderTotal(rows: ProcurementRow[]) {
  const totals = new Map<ProcurementCurrencyCode, number>()
  rows.forEach((row) => {
    if (row.purchasePrice == null) return
    const code = row.purchaseCurrencyCode ?? 'JPY'
    totals.set(code, (totals.get(code) ?? 0) + row.purchasePrice)
  })
  return Array.from(totals, ([currency, value]) => formatMoney(value, currency)).filter(Boolean).join(' · ')
}

const statusProgressIndex: Record<ProcurementStatus, number> = {
  RequiredPurchase: 0, Purchased: 0,
  AwaitingWarehouse: 1, AtOriginWarehouse: 1,
  AwaitingTransitShipment: 2, SentToTransit: 2, ArrivedTransitCountry: 2,
  AwaitingMoscowShipment: 3, SentToMoscow: 3, ArrivedMoscow: 3,
  AwaitingCustomerShipment: 4, HandedToDelivery: 4, Delivered: stages.length,
}

const completedTodoCount: Record<ProcurementStatus, number> = {
  RequiredPurchase: 0,
  Purchased: 1,
  AwaitingWarehouse: 1,
  AtOriginWarehouse: 2,
  AwaitingTransitShipment: 2,
  SentToTransit: 3,
  ArrivedTransitCountry: 4,
  AwaitingMoscowShipment: 4,
  SentToMoscow: 5,
  ArrivedMoscow: 6,
  AwaitingCustomerShipment: 6,
  HandedToDelivery: 7,
  Delivered: 7,
}

function LifecycleProgressStepper({ row, compact = false }: { row: ProcurementRow; compact?: boolean }) {
  const { t } = useTranslation('procurements')
  const current = statusProgressIndex[row.status]
  return <div className={compact ? 'min-w-0' : 'mx-[-8px] mt-2 pt-2 pb-1.5'}>
    <div role="list" aria-label={t('board.progressLabel')} className="flex items-start">
      {stages.map((stage, index) => {
        const complete = index < current
        const active = index === current
        const showIssue = row.openErrorCount > 0 && active
        return <div key={stage} role="listitem" aria-current={active ? 'step' : undefined} aria-label={`${t(`board.stepper.${stage}`)}: ${complete ? t('board.stepComplete') : active ? t('board.stepCurrent') : t('board.stepUpcoming')}`} className="relative flex min-w-0 flex-1 basis-0 flex-col items-center">
          {index < stages.length - 1 ? <span aria-hidden="true" className={`absolute left-1/2 right-[-50%] top-[5px] h-px ${index < current ? 'bg-slate-600' : 'bg-slate-200'}`} /> : null}
          <span aria-hidden="true" title={`${t(`board.stepper.${stage}`)} · ${t(`statuses.lifecycle.${row.status}`)}`} className={`relative z-10 flex size-[10px] items-center justify-center rounded-full transition-colors motion-reduce:transition-none ${complete ? 'bg-slate-600 text-white' : active ? 'border-2 border-blue-400 bg-white ring-2 ring-blue-50' : 'border border-slate-300 bg-white'}`}>
            {complete ? <Check className="size-2" strokeWidth={3} /> : active ? <span className="size-1 rounded-full bg-blue-500" /> : null}
            {showIssue ? <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" /> : null}
          </span>
          <span className={`mt-1.5 whitespace-nowrap text-center ${compact ? 'text-[11px]' : 'text-[9px]'} leading-tight ${active ? 'font-medium text-blue-600' : complete ? 'text-slate-500' : 'text-slate-400'}`}>{t(`board.stepper.${stage}`)}</span>
        </div>
      })}
    </div>
  </div>
}

function ProcurementContext({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const values = row.stage === 'purchase'
    ? [row.shopName]
    : row.stage === 'originWarehouse'
      ? [row.warehouseTrackingNumber, row.warehouseReceivedAt]
      : row.stage === 'transit'
        ? [row.shippingMethod, row.shippingTrackingNumber]
        : row.stage === 'moscow'
          ? [row.shippingTrackingNumber, formatMoney(row.shippingCost, row.shippingCurrencyCode)]
          : [row.shippingMethod, row.shippingTrackingNumber]
  const details = values.filter((value): value is string => Boolean(value?.trim())).slice(0, 2)
  if (!details.length) return null
  return <p className="mt-2 flex min-w-0 gap-1 truncate text-[11px] text-muted-foreground" title={details.join(' · ')}><span className="truncate">{details.join(' · ')}</span><span className="sr-only">{t(`board.stages.${row.stage}`)}</span></p>
}

function LifecycleActions({ row, onTransition, compactPrimary = false, onOpenComment }: { row: ProcurementRow; onTransition: TransitionAction; compactPrimary?: boolean; onOpenComment?: () => void }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [showErrorForm, setShowErrorForm] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [error, setError] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [issueSaved, setIssueSaved] = useState(false)
  const actionStatus = getNextProcurementActionStatus(row.status)
  useEffect(() => {
    if (!issueSaved) return
    const timer = window.setTimeout(() => setIssueSaved(false), 3000)
    return () => window.clearTimeout(timer)
  }, [issueSaved])
  const report = useMutation({
    mutationFn: () => procurementsApi.createProcurementError(row.id, errorText),
    onSuccess: () => {
      setErrorText('')
      setError('')
      setShowErrorForm(false)
      setIssueSaved(true)
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
    },
    onError: (value) => setError(value instanceof ApiError ? value.message : t('board.errorCreateFailed')),
  })
  const transition = (status: ProcurementStatus) => {
    const operation = onTransition(row, status)
    if (!operation) return
    setTransitioning(true)
    void operation.then(() => setTransitioning(false), () => setTransitioning(false))
  }
  return <div className={`${compactPrimary ? 'mt-auto' : 'mt-1'} space-y-0`} onClick={(event) => event.stopPropagation()}>
    {row.status !== 'Delivered' ? <div className="flex items-center justify-between gap-2"><button type="button" className={`flex w-fit shrink-0 flex-nowrap items-center justify-start gap-1.5 whitespace-nowrap bg-transparent px-0 font-medium text-[#667085] hover:bg-[#F3F4F6] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compactPrimary ? 'h-[22px] rounded-[5px] text-[9px]' : 'h-8 rounded-lg text-[10px]'}`} onClick={() => onOpenComment ? onOpenComment() : setShowErrorForm((value) => !value)}><span className="relative flex size-[14px] shrink-0 items-center justify-center"><MessageSquare className="size-[14px]" /><Plus className="absolute size-[6px] stroke-[3]" /></span>{t('board.reportError')}</button>{row.openErrorCount > 0 ? <span role="status" className="shrink-0 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-amber-700" title={t('board.openIssues', { count: row.openErrorCount })} aria-label={t('board.openIssues', { count: row.openErrorCount })}>{row.openErrorCount}</span> : null}</div> : null}
    {actionStatus ? <div className="space-y-1.5"><Button size="sm" className={`${compactPrimary ? 'h-[22px] min-w-0 w-full overflow-hidden rounded-[5px] whitespace-nowrap' : 'h-11 w-full rounded-[10px]'} gap-[10px] bg-[#111827] text-[9px] font-semibold text-white shadow-none transition-colors hover:bg-slate-700 active:bg-slate-800`} disabled={transitioning} title={t(`actions.${actionStatus}`)} onClick={() => transition(actionStatus)}>{transitioning ? <><LoaderCircle className="animate-spin motion-reduce:animate-none" />{t('board.updating')}</> : t(`actions.${actionStatus}`)}</Button></div> : null}
    {issueSaved ? <p role="status" className="text-[11px] text-emerald-700">{t('board.errorSaved')}</p> : null}
    {showErrorForm && !onOpenComment ? <div className="animate-in fade-in-0 slide-in-from-top-1 space-y-2 rounded-lg bg-muted/50 p-2 duration-200"><textarea value={errorText} onChange={(event) => setErrorText(event.target.value)} maxLength={2000} rows={2} placeholder={t('board.errorPlaceholder')} className="w-full resize-y rounded-md border bg-background p-2 text-sm" />{error ? <p className="text-xs text-destructive">{error}</p> : null}<div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setShowErrorForm(false)}>{t('cancel')}</Button><Button size="sm" disabled={!errorText.trim() || report.isPending} onClick={() => report.mutate()}>{t('board.sendError')}</Button></div></div> : null}
  </div>
}

function PurchaseOrderItem({ group, row, position, commentOpen, onCommentOpenChange, onDragStart, onDragEnd, onTransition }: { group: OrderGroup; row: ProcurementRow; position: number; commentOpen: boolean; onCommentOpenChange: (rowId: string, open: boolean) => void; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const { t } = useTranslation('procurements')
  const [undoingPurchase, setUndoingPurchase] = useState(false)
  const url = safeProductUrl(row.productUrl)
  const meta = [formatMoney(row.purchasePrice ?? row.unitPrice, row.purchasePrice == null ? row.itemCurrencyCode as ProcurementCurrencyCode | null : row.purchaseCurrencyCode)].filter(Boolean)
  const undoPurchase = () => {
    if (undoingPurchase) return
    const operation = onTransition(row, 'RequiredPurchase')
    if (!operation) return
    setUndoingPurchase(true)
    void operation.then(() => setUndoingPurchase(false), () => setUndoingPurchase(false))
  }
  return (
    <div data-procurement-item draggable onDragStart={(event) => startItemDrag(event, row, onDragStart)} onDragEnd={onDragEnd} className={`cursor-grab active:cursor-grabbing ${position > 1 ? 'pt-3' : ''}`}>
      <div className="relative overflow-hidden">
      <div inert={commentOpen} className={`transition-transform duration-300 ease-in-out motion-reduce:transition-none ${commentOpen ? '-translate-x-[150%] pointer-events-none' : 'translate-x-0'}`}>
      <div className="mb-1 flex min-w-0 items-center gap-2"><span className="shrink-0 text-[10px] text-[#9CA3AF]">{t('board.positionShort', { current: position, total: group.rows.length })}</span><p className={`min-w-0 break-words leading-4 ${row.status === 'RequiredPurchase' || row.status === 'Purchased' ? 'text-[9px]' : 'text-[12px]'} ${row.status === 'RequiredPurchase' ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`} title={t(`statuses.lifecycle.${row.status}`)}>{t(`statuses.lifecycle.${row.status}`)}</p>{row.status === 'Purchased' ? <button type="button" className="shrink-0 text-[9px] text-muted-foreground underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-50" disabled={undoingPurchase} onClick={(event) => { event.stopPropagation(); undoPurchase() }}>{t('actions.undoPurchaseShort')}</button> : null}</div>
      <div className="mt-3 flex min-w-0 items-stretch gap-1.5">
        <Link to={`/admin/procurements/items/${row.id}`} aria-label={t('board.openItem')} className="shrink-0 rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ProductImage row={row} className="size-[94px]" /></Link>
        <div className="flex min-h-[94px] min-w-0 flex-1 flex-col">
          <Link to={`/admin/procurements/items/${row.id}`} className="block rounded-sm text-[10px] font-semibold leading-3 text-[#111827] line-clamp-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={productTitle(row)}>{productTitle(row)}</Link>
          {url ? <a href={url.href} target="_blank" rel="noopener noreferrer" title={row.productUrl ?? undefined} className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-[#667085] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="truncate">{compactProductUrl(row.productUrl!)}</span><ExternalLink className="size-3 shrink-0" /></a> : null}
          <div className="mt-1 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-[#6B7280]" title={meta.join(' · ')}>{meta.map((value, index) => <span key={`${row.id}-meta-${index}`} className="min-w-0 truncate">{value}</span>)}</div>
          <LifecycleActions row={row} onTransition={onTransition} compactPrimary onOpenComment={() => onCommentOpenChange(row.id, true)} />
        </div>
      </div>
      <ProcurementContext row={row} />
      <LifecycleProgressStepper row={row} />
      </div>
      <ProcurementCommentsChat procurementId={row.id} variant="popover" open={commentOpen} onClose={() => onCommentOpenChange(row.id, false)} />
      </div>
    </div>
  )
}

function OrderItemPreview({ row, position, total, compactAction = false, hidePosition = false, hideStatus = false, onTransition, onOpenComment }: { row: ProcurementRow; position: number; total: number; compactAction?: boolean; hidePosition?: boolean; hideStatus?: boolean; onTransition?: TransitionAction; onOpenComment?: () => void }) {
  const { t } = useTranslation('procurements')
  const url = safeProductUrl(row.productUrl)
  const meta = [hidePosition ? null : t('board.positionShort', { current: position, total }), formatMoney(row.purchasePrice ?? row.unitPrice, row.purchasePrice == null ? row.itemCurrencyCode as ProcurementCurrencyCode | null : row.purchaseCurrencyCode)].filter(Boolean)
  return <div className="flex min-w-0 items-start gap-1.5">
    <Link to={`/admin/procurements/items/${row.id}`} aria-label={t('board.openItem')} className="shrink-0 rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ProductImage row={row} className="size-[94px]" /></Link>
    <div className={`${compactAction ? 'flex min-h-[94px] flex-col' : ''} min-w-0 flex-1`}>
      <Link to={`/admin/procurements/items/${row.id}`} className="block line-clamp-2 rounded-sm text-[10px] font-semibold leading-3 text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={productTitle(row)}>{productTitle(row)}</Link>
      {url ? <a href={url.href} target="_blank" rel="noopener noreferrer" title={row.productUrl ?? undefined} className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-[#667085] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="truncate">{compactProductUrl(row.productUrl!)}</span><ExternalLink className="size-3 shrink-0" /></a> : null}
      <div className="mt-1 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-[#6B7280]" title={meta.join(' · ')}>{meta.map((value, index) => <span key={`${row.id}-meta-${index}`} className="min-w-0 truncate">{value}</span>)}</div>
      {compactAction && onTransition ? <LifecycleActions row={row} onTransition={onTransition} compactPrimary onOpenComment={onOpenComment} /> : null}
    </div>
    {!hideStatus && row.status !== 'AwaitingWarehouse' ? <span className="max-w-[38%] shrink-0 truncate whitespace-nowrap text-right text-[11px] font-medium text-[#9CA3AF]" title={t(`statuses.lifecycle.${row.status}`)}>{t(`statuses.lifecycle.${row.status}`)}</span> : null}
  </div>
}

function CommentableOrderItem({ group, row, position, stage, onDragStart, onDragEnd, onTransition, onCommentOpenChange }: { group: OrderGroup; row: ProcurementRow; position: number; stage: 'originWarehouse' | 'transit' | 'moscow'; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction; onCommentOpenChange: (rowId: string, open: boolean) => void }) {
  const [commentOpen, setCommentOpen] = useState(false)
  const compactAction = row.nextStatus === 'AtOriginWarehouse' || row.nextStatus === 'AwaitingTransitShipment' || row.nextStatus === 'SentToTransit' || row.nextStatus === 'SentToMoscow'
  return <div data-procurement-item draggable onDragStart={(event) => startItemDrag(event, row, onDragStart)} onDragEnd={onDragEnd} className={`cursor-grab active:cursor-grabbing ${position > 1 ? 'pt-3' : ''}`}>
    <div className="relative">
      <div inert={commentOpen} className={`transition-transform duration-300 ease-in-out motion-reduce:transition-none ${commentOpen ? '-translate-x-[150%] pointer-events-none' : 'translate-x-0'}`}>
        <OrderItemPreview row={row} position={position} total={group.rows.length} compactAction={compactAction} hidePosition={stage === 'originWarehouse'} hideStatus onTransition={onTransition} onOpenComment={() => { setCommentOpen(true); onCommentOpenChange(row.id, true) }} />
        <ProcurementContext row={row} />
        <LifecycleProgressStepper row={row} />
        {!compactAction ? <LifecycleActions row={row} onTransition={onTransition} onOpenComment={() => { setCommentOpen(true); onCommentOpenChange(row.id, true) }} /> : null}
      </div>
      <ProcurementCommentsChat procurementId={row.id} variant="popover" open={commentOpen} onClose={() => { setCommentOpen(false); onCommentOpenChange(row.id, false) }} />
    </div>
  </div>
}

function OrderCard({ group, stage, onDragStart, onDragEnd, onTransition }: { group: OrderGroup; stage: BoardStage; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const { t } = useTranslation('procurements')
  const [activeCommentRowId, setActiveCommentRowId] = useState<string | null>(null)
  const total = orderTotal(group.rows)
  return <article className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFB] px-2 py-[14px] shadow-[0_2px_8px_rgba(16,24,40,0.06)] transition-[box-shadow,border-color] duration-150 hover:border-slate-300 hover:shadow-[0_3px_10px_rgba(16,24,40,0.09)] motion-reduce:transition-none">
    <div className="overflow-hidden"><div inert={activeCommentRowId !== null} className={`flex items-start gap-2 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${activeCommentRowId !== null ? '-translate-x-[150%] pointer-events-none' : 'translate-x-0'}`}><Link to={`/admin/procurements/orders/${group.orderId}/${stage}`} className="flex min-w-0 flex-1 flex-col rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><OrderBadge group={group} />{stage !== 'purchase' ? <span className={`mt-[3px] break-words leading-4 ${stage === 'originWarehouse' ? 'text-[9px]' : group.rows[0]?.status === 'RequiredPurchase' || group.rows[0]?.status === 'Purchased' || group.rows[0]?.status === 'AwaitingWarehouse' || group.rows[0]?.status === 'AwaitingTransitShipment' || group.rows[0]?.status === 'AwaitingMoscowShipment' ? 'text-[9px]' : 'text-[12px]'} ${group.rows[0]?.status === 'RequiredPurchase' ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>{group.rows[0] ? t(`statuses.lifecycle.${group.rows[0].status}`) : ''}</span> : null}</Link>{group.rows[0] ? <div className="ml-auto shrink-0 [&_button]:size-9"><CardMenu row={group.rows[0]} group={group} /></div> : null}</div></div>
    <div className={`mt-3 ${stage === 'originWarehouse' ? '' : 'divide-y divide-[#EAECF0]'}`}>{group.rows.map((row, index) => {
      const compactAction = row.nextStatus === 'AtOriginWarehouse' || row.nextStatus === 'AwaitingTransitShipment' || row.nextStatus === 'SentToTransit' || row.nextStatus === 'SentToMoscow'
      if (stage === 'purchase') return <PurchaseOrderItem key={row.id} group={group} row={row} position={index + 1} commentOpen={activeCommentRowId === row.id} onCommentOpenChange={(rowId, open) => setActiveCommentRowId((current) => open ? rowId : current === rowId ? null : current)} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} />
      if (stage === 'originWarehouse' || stage === 'transit' || stage === 'moscow') return <CommentableOrderItem key={row.id} group={group} row={row} position={index + 1} stage={stage} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} onCommentOpenChange={(rowId, open) => setActiveCommentRowId((current) => open ? rowId : current === rowId ? null : current)} />
      return <div key={row.id} data-procurement-item draggable onDragStart={(event) => startItemDrag(event, row, onDragStart)} onDragEnd={onDragEnd} className={`cursor-grab active:cursor-grabbing ${index ? 'pt-3' : ''}`}>
        <OrderItemPreview row={row} position={index + 1} total={group.rows.length} compactAction={compactAction} onTransition={onTransition} />
        <ProcurementContext row={row} />
        <LifecycleProgressStepper row={row} />
        {!compactAction ? <LifecycleActions row={row} onTransition={onTransition} /> : null}
      </div>
    })}</div>
    {stage === 'moscow' && total ? <p className="mt-3 border-t pt-2 text-xs font-semibold">{t('board.total')}: {total}</p> : null}
  </article>
}

function EmptyLane({ purchase }: { purchase: boolean }) {
  const { t } = useTranslation('procurements')
  return <p className="py-8 text-center text-sm text-muted-foreground">{t(purchase ? 'board.noItems' : 'board.noOrders')}</p>
}

function EmptyFilteredLane() {
  const { t } = useTranslation('procurements')
  return <p className="py-8 text-center text-sm text-muted-foreground">{t('board.noDateMatches')}</p>
}

function BoardColumnHeader({
  stage,
  groups,
  allGroups,
  dateRange,
  mobile,
  onDateRangeChange,
}: {
  stage: BoardStage
  groups: OrderGroup[]
  allGroups: OrderGroup[]
  dateRange: DateRange | undefined
  mobile: boolean
  onDateRangeChange: (range: DateRange | undefined) => void
}) {
  const { t, i18n } = useTranslation('procurements')
  const [open, setOpen] = useState(false)
  const title = t(`board.stages.${stage}`)
  const counts = countProductsAndDistinctOrders(groups.flatMap((group) => group.rows))
  const productCount = counts.products
  const orderCount = counts.orders
  const filterActive = Boolean(dateRange?.from || dateRange?.to)
  const locale = i18n.language?.startsWith('en') ? enUS : ru
  const calendarOrderCounts = countOrdersByCreatedDate(allGroups.flatMap((group) => group.rows))
  const applyPreset = (preset: 'week' | 'month') => {
    const today = endOfDay(new Date())
    const from = startOfDay(preset === 'week' ? subDays(today, 6) : subMonths(today, 1))
    onDateRangeChange({ from, to: today })
    setOpen(false)
  }

  return (
    <div className={`mb-3 flex flex-col justify-between ${mobile ? 'h-[60px]' : 'h-12'}`}>
      <h2 className={`truncate ${mobile ? 'text-xl font-semibold tracking-tight' : 'text-sm font-semibold'}`}>
        {title}
      </h2>
      <div className="flex h-7 min-w-0 items-center justify-between gap-1">
        <span className={`min-w-0 truncate text-muted-foreground ${mobile ? 'text-xs' : 'text-[10px]'}`}>
          {t('board.itemsAndOrders', {
            items: t('board.itemCount', { count: productCount }),
            orders: t('board.orderCount', { count: orderCount }),
          })}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('board.filterByDate', { stage: title })}
              aria-pressed={filterActive}
              title={t('board.filterByDate', { stage: title })}
              className={`size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted/70 ${filterActive ? 'text-blue-600' : ''}`}
            >
              <CalendarDays className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-2" onOpenAutoFocus={(event) => event.preventDefault()}>
            <Calendar
              mode="range"
              className="[--cell-size:2.25rem] sm:[--cell-size:2.75rem]"
              captionLayout="dropdown"
              numberOfMonths={1}
              dayCounts={calendarOrderCounts}
              selected={dateRange}
              defaultMonth={dateRange?.from ?? dateRange?.to}
              onSelect={(nextRange) => {
                onDateRangeChange(nextRange?.from || nextRange?.to ? nextRange : undefined)
                if (nextRange?.from && nextRange.to) setOpen(false)
              }}
              locale={locale}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('week')}>
                {t('board.datePresetWeek')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('month')}>
                {t('board.datePresetMonth')}
              </Button>
            </div>
            {filterActive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => onDateRangeChange(undefined)}
              >
                {t('board.clearDateFilter')}
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

function MoscowGroups({ groups, onDragStart, onDragEnd, onTransition }: { groups: OrderGroup[]; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const { t } = useTranslation('procurements')
  const shipments = new Map<string, OrderGroup[]>()
  const ungrouped: OrderGroup[] = []
  groups.forEach((group) => {
    const tracking = group.rows.find((row) => row.warehouseTrackingNumber)?.warehouseTrackingNumber
    if (!tracking) ungrouped.push(group)
    else shipments.set(tracking, [...(shipments.get(tracking) ?? []), group])
  })
  const section = (key: string, title: string, orders: OrderGroup[]) => <div key={key} className="space-y-2"><div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs font-medium"><Truck className="size-3.5" /><span className="truncate">{title}</span><span className="ml-auto shrink-0 text-muted-foreground">{t('board.orderCount', { count: orders.length })}</span></div><div className="space-y-1">{orders.map((group) => <OrderCard key={group.orderId} group={group} stage="moscow" onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} />)}</div></div>
  return <div className="space-y-4">{ungrouped.length ? section('ungrouped', t('board.ungrouped'), ungrouped) : null}{Array.from(shipments, ([tracking, orders]) => section(tracking, `MSK SHIP · ${tracking}`, orders))}</div>
}

function BoardLane({ stage, groups, mobile = false, dropStage, dateRange, onDateRangeChange, onDragStart, onDragEnd, onTransition }: { stage: BoardStage; groups: OrderGroup[]; mobile?: boolean; dropStage: BoardStage | null; dateRange: DateRange | undefined; onDateRangeChange: (range: DateRange | undefined) => void; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const visibleGroups = filterGroupsByCreatedDate(groups, dateRange, stage)
  const count = visibleGroups.reduce((sum, group) => sum + group.rows.length, 0)
  return (
    <section
      data-procurement-stage={stage}
      className={`min-h-[50dvh] min-w-0 rounded-2xl px-0 py-2 transition-colors ${dropStage === stage ? 'bg-muted/70 ring-2 ring-muted-foreground/10' : ''}`}
    >
      <BoardColumnHeader stage={stage} groups={visibleGroups} allGroups={groups} dateRange={dateRange} mobile={mobile} onDateRangeChange={onDateRangeChange} />
      {stage === 'moscow' ? <MoscowGroups groups={visibleGroups} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} /> : <div className="space-y-1">{visibleGroups.map((group) => <OrderCard key={group.orderId} group={group} stage={stage} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} />)}</div>}
      {!count ? (dateRange?.from || dateRange?.to ? <EmptyFilteredLane /> : <EmptyLane purchase={stage === 'purchase'} />) : null}
    </section>
  )
}

function BoardSkeleton() {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">{stages.map((stage) => <div key={stage}><Skeleton className="mb-3 h-8 w-36" /><div className="space-y-3"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-52 rounded-xl" /></div></div>)}</div>
}

function DesktopBoard({ groups, activeDrag, dateRanges, onDateRangeChange, onMove, onDragStart, onDragEnd, onTransition }: { groups: OrderGroup[]; activeDrag: ActiveProcurementDrag | null; dateRanges: Partial<Record<BoardStage, DateRange>>; onDateRangeChange: (stage: BoardStage, range: DateRange | undefined) => void; onMove: (rowId: string, stage: BoardStage) => void; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const drop = useColumnDropTarget(activeDrag, onMove)
  return <div className="grid grid-cols-5 items-start gap-1" onDragOver={drop.onDragOver} onDragLeave={drop.onDragLeave} onDrop={drop.onDrop}>{stages.map((stage) => <BoardLane key={stage} stage={stage} groups={groupsForStage(groups, stage)} dateRange={dateRanges[stage]} onDateRangeChange={(range) => onDateRangeChange(stage, range)} dropStage={drop.dropStage} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} />)}</div>
}

function MobileBoard({ groups, activeDrag, dateRanges, onDateRangeChange, onMove, onDragStart, onDragEnd, onTransition }: { groups: OrderGroup[]; activeDrag: ActiveProcurementDrag | null; dateRanges: Partial<Record<BoardStage, DateRange>>; onDateRangeChange: (stage: BoardStage, range: DateRange | undefined) => void; onMove: (rowId: string, stage: BoardStage) => void; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const { t } = useTranslation('procurements')
  const [active, setActive] = useState<BoardStage>('purchase')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const activate = (stage: BoardStage) => { setActive(stage); const index = stages.indexOf(stage); scrollerRef.current?.scrollTo({ left: index * scrollerRef.current.clientWidth, behavior: 'smooth' }) }
  const syncFromScroll = () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); animationRef.current = requestAnimationFrame(() => { const scroller = scrollerRef.current; if (!scroller?.clientWidth) return; setActive(stages[Math.max(0, Math.min(stages.length - 1, Math.round(scroller.scrollLeft / scroller.clientWidth)))]) }) }
  const countFor = (stage: BoardStage) => filterGroupsByCreatedDate(groupsForStage(groups, stage), dateRanges[stage], stage).reduce((sum, group) => sum + group.rows.length, 0)
  const drop = useColumnDropTarget(activeDrag, onMove)
  return (
    <Tabs value={active} onValueChange={(value) => activate(value as BoardStage)} className="min-w-0 gap-4">
      <TabsList className="grid h-12 w-full grid-cols-5 rounded-2xl p-1">{stages.map((stage) => <TabsTrigger key={stage} value={stage} className="group min-w-0 gap-1 rounded-xl px-1 text-[10px] sm:text-xs"><span className="truncate">{t(`board.mobileStages.${stage}`)}</span><span className="rounded-full bg-background/70 px-1.5 text-[10px] tabular-nums group-data-[state=active]:bg-blue-50 group-data-[state=active]:text-blue-700">{countFor(stage)}</span></TabsTrigger>)}</TabsList>
      <div ref={scrollerRef} data-procurement-scroll className="flex min-h-[calc(100dvh-13rem)] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x touch-pan-y [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onScroll={syncFromScroll} onDragOver={drop.onDragOver} onDragLeave={drop.onDragLeave} onDrop={drop.onDrop}>
        {stages.map((stage, index) => <TabsContent key={stage} value={stage} forceMount className={`mt-0 block min-h-full w-full min-w-full shrink-0 snap-start snap-always data-[state=inactive]:block ${index < stages.length - 1 ? 'pr-5' : ''}`}><BoardLane mobile stage={stage} groups={groupsForStage(groups, stage)} dateRange={dateRanges[stage]} onDateRangeChange={(range) => onDateRangeChange(stage, range)} dropStage={drop.dropStage} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} /></TabsContent>)}
      </div>
    </Tabs>
  )
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => { const media = window.matchMedia(query); const update = () => setMatches(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update) }, [query])
  return matches
}

function useProcurements() {
  return useQuery({ queryKey: ['procurements'], queryFn: ({ signal }) => procurementsApi.getProcurements(signal) })
}

function useAllProcurements() {
  return useQuery({ queryKey: ['procurements', 'all'], queryFn: async ({ signal }) => {
    const [active, archive] = await Promise.all([procurementsApi.getProcurements(signal), procurementsApi.getProcurementArchive(signal)])
    return [...active, ...archive]
  } })
}

export function ProcurementsPage() {
  const { t } = useTranslation('procurements')
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dateRanges, setDateRanges] = useState<Partial<Record<BoardStage, DateRange>>>({})
  const [moveError, setMoveError] = useState<string | null>(null)
  const [moveSuccess, setMoveSuccess] = useState(false)
  const [activeDrag, setActiveDrag] = useState<ActiveProcurementDrag | null>(null)
  useEffect(() => {
    if (!moveSuccess) return
    const timer = window.setTimeout(() => setMoveSuccess(false), 2500)
    return () => window.clearTimeout(timer)
  }, [moveSuccess])
  const query = useProcurements()
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const groups = useMemo(() => groupOrders(query.data ?? []).filter((group) => matchesSearch(group, normalizedSearch)), [normalizedSearch, query.data])
  const updateDateRange = (stage: BoardStage, range: DateRange | undefined) => {
    setDateRanges((current) => {
      const next = { ...current }
      if (range?.from || range?.to) next[stage] = range
      else delete next[stage]
      return next
    })
  }
  const moveMutation = useMutation({
    mutationFn: async ({ row, status, stage }: { row: ProcurementRow; status?: ProcurementStatus; stage?: string }) => {
      return procurementsApi.transitionProcurement(row.id, { status, targetStage: stage })
    },
    onSuccess: (updated) => {
      setMoveError(null)
      setMoveSuccess(true)
      queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((row) => row.id === updated.id ? updated : row))
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
      void queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    },
    onError: (error) => setMoveError(error instanceof ApiError ? error.message : t('board.moveError')),
  })
  const moveItem = (rowId: string, stage: BoardStage) => {
    const row = query.data?.find((item) => item.id === rowId)
    if (!row || moveMutation.isPending || deriveItemStage(row) === stage) return
    setMoveError(null)
    setMoveSuccess(false)
    moveMutation.mutate({ row, stage })
  }
  const transitionItem: TransitionAction = (row, status, stage) => {
    if (moveMutation.isPending) return undefined
    setMoveError(null)
    setMoveSuccess(false)
    return moveMutation.mutateAsync({ row, status, stage })
  }
  const dragProps = { activeDrag, onMove: moveItem, onDragStart: setActiveDrag, onDragEnd: () => setActiveDrag(null), onTransition: transitionItem }
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-[29px] font-bold leading-tight tracking-tight lg:text-2xl">{t('title')}</h1><div className="flex w-full min-w-0 items-center gap-2 sm:w-auto"><div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none sm:max-w-sm"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground lg:left-3" /><Input aria-label={t('mobile.searchPlaceholder')} className="h-12 rounded-2xl bg-white pl-11 lg:h-9 lg:rounded-md lg:pl-9" value={search} placeholder={t('mobile.searchPlaceholder')} onChange={(event) => setSearch(event.target.value)} /></div><Button asChild size="icon" variant="outline" className="h-12 w-12 shrink-0 lg:h-9 lg:w-9" aria-label={t('board.archive')} title={t('board.archive')}><Link to="/admin/procurements/archive"><Archive /></Link></Button></div></div>{moveError ? <Alert variant="destructive"><AlertDescription>{moveError}</AlertDescription></Alert> : moveSuccess ? <p role="status" className="text-sm text-emerald-700">{t('board.statusUpdated')}</p> : null}{query.isLoading ? <BoardSkeleton /> : query.isError ? <div className="rounded-xl border p-6 text-center"><p className="font-medium">{t('mobile.loadError')}</p><Button variant="outline" className="mt-3" onClick={() => void query.refetch()}>{t('retry', { ns: 'common' })}</Button></div> : isMobile ? <MobileBoard groups={groups} dateRanges={dateRanges} onDateRangeChange={updateDateRange} {...dragProps} /> : <DesktopBoard groups={groups} dateRanges={dateRanges} onDateRangeChange={updateDateRange} {...dragProps} />}</div>
}

export function ProcurementsArchivePage() {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['procurements', 'archive'], queryFn: ({ signal }) => procurementsApi.getProcurementArchive(signal) })
  const restore = useMutation({ mutationFn: ({ id, status }: { id: string; status: ProcurementStatus }) => procurementsApi.transitionProcurement(id, { status }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['procurements'] }) } })
  return <div className="space-y-5"><Button asChild variant="ghost" className="-ml-2"><Link to="/admin/procurements"><ArrowLeft />{t('board.back')}</Link></Button><h1 className="text-2xl font-bold">{t('board.archive')}</h1>{restore.isError ? <Alert variant="destructive"><AlertDescription>{t('board.moveError')}</AlertDescription></Alert> : null}<Card size="sm"><CardContent>{query.isLoading ? <Skeleton className="h-24 w-full" /> : query.isError ? <Alert variant="destructive"><AlertDescription>{t('mobile.loadError')}</AlertDescription></Alert> : <div className="space-y-3">{query.data?.length ? query.data.map((row) => <article key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"><Link to={`/admin/procurements/items/${row.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ProductImage row={row} className="size-12" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{productTitle(row)}</p><p className="text-sm text-muted-foreground">{t('board.orderNumber', { code: row.trackingCode })}</p></div><span className="text-sm text-[#667085]">{t(`statuses.lifecycle.${row.status}`)}</span></Link>{row.previousStatus ? <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate({ id: row.id, status: row.previousStatus! })}>{t('board.restoreToDelivery')}</Button> : null}</article>) : <p className="py-8 text-center text-sm text-muted-foreground">{t('board.archiveEmpty')}</p>}</div>}</CardContent></Card></div>
}

function emptyToNull(value: string) { return value === '' ? null : value }
function numberOrNull(value: string) { if (!value) return null; const parsed = Number(value.replace(',', '.')); return Number.isFinite(parsed) ? parsed : null }

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={id} className="text-sm text-muted-foreground">{label}</Label>{children}</div>
}

function InlinePurchaseUrl({ value, disabled, onSave, onEditStart }: { value: string | null; disabled: boolean; onSave: (value: string | null) => Promise<boolean>; onEditStart: () => void }) {
  const { t } = useTranslation('procurements')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const committingRef = useRef(false)
  const skipBlurRef = useRef(false)
  const url = safeProductUrl(value)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const beginEditing = () => {
    setDraft(value ?? '')
    onEditStart()
    setEditing(true)
  }
  const commit = async () => {
    if (!editing || disabled || committingRef.current) return
    committingRef.current = true
    if (await onSave(emptyToNull(draft.trim()))) setEditing(false)
    committingRef.current = false
  }
  const cancel = () => {
    skipBlurRef.current = true
    setDraft(value ?? '')
    setEditing(false)
  }

  return <div className="flex min-w-0 items-center gap-1">
    {editing
      ? <Input ref={inputRef} id="purchase-url-inline" className="h-9 min-w-0 bg-white" value={draft} disabled={disabled} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false; return } void commit() }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void commit() } if (event.key === 'Escape') { event.preventDefault(); cancel() } }} />
      : <>
        {url
          ? <a href={url.href} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all text-sm text-blue-600 hover:underline" title={value ?? undefined}>{value}</a>
          : <span className="min-w-0 break-all text-sm text-[#9CA3AF]">{value || t('notSpecified')}</span>}
        <Button type="button" variant="ghost" size="icon-xs" disabled={disabled} aria-label={t('edit')} className="size-6 shrink-0 text-[#667085]" onClick={beginEditing}><Pencil className="size-3" /></Button>
      </>}
  </div>
}

function InlinePurchasePrice({ value, currency, disabled, onSave, onEditStart }: { value: number | null; currency: ProcurementCurrencyCode; disabled: boolean; onSave: (value: number | null, currency: ProcurementCurrencyCode) => Promise<boolean>; onEditStart: () => void }) {
  const { t } = useTranslation('procurements')
  const [editing, setEditing] = useState(false)
  const [draftValue, setDraftValue] = useState(value?.toString() ?? '')
  const [draftCurrency, setDraftCurrency] = useState(currency)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const committingRef = useRef(false)
  const skipBlurRef = useRef(false)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const beginEditing = () => {
    setDraftValue(value?.toString() ?? '')
    setDraftCurrency(currency)
    onEditStart()
    setEditing(true)
  }
  const commit = async () => {
    if (!editing || disabled || committingRef.current) return
    committingRef.current = true
    const parsed = numberOrNull(draftValue.trim())
    if (await onSave(parsed, draftCurrency)) setEditing(false)
    committingRef.current = false
  }
  const cancel = () => {
    skipBlurRef.current = true
    setDraftValue(value?.toString() ?? '')
    setDraftCurrency(currency)
    setEditing(false)
  }
  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false
      return
    }
    const next = event.relatedTarget
    if (next instanceof Element && (rootRef.current?.contains(next) || next.closest('[data-slot="select-content"]'))) return
    window.setTimeout(() => {
      const active = document.activeElement
      if (active instanceof Element && (rootRef.current?.contains(active) || active.closest('[data-slot="select-content"]'))) return
      void commit()
    }, 0)
  }

  return <div ref={rootRef} className="flex min-w-0 items-center gap-1" onBlurCapture={editing ? handleBlur : undefined}>
    {editing
      ? <div className="flex min-w-0 items-center gap-1.5">
        <Input ref={inputRef} id="purchase-price-inline" type="number" step="any" className="h-9 w-28 bg-white" inputMode="decimal" value={draftValue} disabled={disabled} onChange={(event) => setDraftValue(event.target.value)} onKeyDown={(event) => { if (event.target instanceof HTMLInputElement && event.key === 'Enter') { event.preventDefault(); void commit() } if (event.target instanceof HTMLInputElement && event.key === 'Escape') { event.preventDefault(); cancel() } }} />
        <Select value={draftCurrency} disabled={disabled} onValueChange={(next) => setDraftCurrency(next as ProcurementCurrencyCode)}>
          <SelectTrigger aria-label={t('fields.purchasePrice')} className="h-9 w-[92px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>{currencies.map((code) => <SelectItem key={code} value={code}>{currencySymbols[code]} {code}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      : <>
        {value == null
          ? <span className="text-sm text-[#9CA3AF]">{t('notSpecified')}</span>
          : <span className="inline-flex items-baseline gap-1.5"><span className="text-base font-medium text-[#111827]">{value.toLocaleString('ru-RU')}</span><span className="text-sm text-[#667085]">{currencySymbols[currency]} {currency}</span></span>}
        <Button type="button" variant="ghost" size="icon-xs" disabled={disabled} aria-label={t('edit')} className="size-6 shrink-0 text-[#667085]" onClick={beginEditing}><Pencil className="size-3" /></Button>
      </>}
  </div>
}

function MoneyField({ id, value, currency, onValue, onCurrency }: { id: string; value: number | null; currency: ProcurementCurrencyCode; onValue: (value: number | null) => void; onCurrency: (value: ProcurementCurrencyCode) => void }) {
  return <div className="flex min-w-0"><Input id={id} className="h-9 min-w-0 rounded-r-none bg-white" inputMode="decimal" value={value ?? ''} onChange={(event) => onValue(numberOrNull(event.target.value))} /><Select value={currency} onValueChange={(value) => onCurrency(value as ProcurementCurrencyCode)}><SelectTrigger aria-label="Валюта" className="w-[92px] shrink-0 rounded-l-none border-l-0 bg-white data-[size=default]:h-9"><SelectValue /></SelectTrigger><SelectContent>{currencies.map((code) => <SelectItem key={code} value={code}>{currencySymbols[code]} {code}</SelectItem>)}</SelectContent></Select></div>
}

function CopyField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { if (!value) return; await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1200) }
  return <div className="relative"><Input id={id} className="h-9 bg-white pr-10" value={value} onChange={(event) => onChange(event.target.value)} />{value ? <Button type="button" size="icon-sm" variant="ghost" className="absolute right-0 top-0 size-9" onClick={() => void copy()}>{copied ? <Check /> : <Copy />}</Button> : null}</div>
}

function useRowForm(row: ProcurementRow, onError: (message: string) => void) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const initial = createForm(row)
  const [form, setForm] = useState(initial)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const saveStateRef = useRef(saveState)
  const savedRef = useRef(initial)
  const formRef = useRef(initial)
  const saveTimerRef = useRef<number | null>(null)
  const savePromiseRef = useRef<Promise<boolean> | null>(null)

  useEffect(() => {
    const next = createForm(row)
    savedRef.current = next
    formRef.current = next
    setForm(next)
    setSaveState('idle')
  }, [row])

  useEffect(() => { formRef.current = form }, [form])
  useEffect(() => { saveStateRef.current = saveState }, [saveState])

  const saveNow = useCallback(async (snapshot = formRef.current) => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (JSON.stringify(snapshot) === JSON.stringify(savedRef.current)) return true
    if (savePromiseRef.current) return savePromiseRef.current

    setSaveState('saving')
    const request = (async () => {
      try {
        const updated = await procurementsApi.updateProcurement(row.id, snapshot)
        const saved = createForm(updated)
        savedRef.current = saved
        if (JSON.stringify(formRef.current) === JSON.stringify(snapshot)) {
          formRef.current = saved
          setForm(saved)
        }
        queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === updated.id ? updated : value))
        void queryClient.invalidateQueries({ queryKey: ['procurements'] })
        setSaveState('saved')
        return true
      } catch (error) {
        setSaveState('error')
        onError(error instanceof ApiError ? error.message : t('updateError'))
        return false
      }
    })()
    savePromiseRef.current = request
    const succeeded = await request
    if (savePromiseRef.current === request) savePromiseRef.current = null
    return succeeded
  }, [onError, queryClient, row.id, t])

  const savePatch = useCallback((patch: Partial<UpdateProcurementRequest>) => {
    const next = { ...formRef.current, ...patch }
    formRef.current = next
    setForm(next)
    return saveNow(next)
  }, [saveNow])

  useEffect(() => {
    if (JSON.stringify(form) === JSON.stringify(savedRef.current)) return
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      void saveNow()
    }, autoSaveDelayMs)
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [form, saveNow])

  useEffect(() => () => {
    if (savePromiseRef.current || saveStateRef.current === 'error') return
    const snapshot = formRef.current
    if (JSON.stringify(snapshot) !== JSON.stringify(savedRef.current)) void procurementsApi.updateProcurement(row.id, snapshot)
  }, [row.id])

  return { form, setForm, saveState, isDirty: JSON.stringify(form) !== JSON.stringify(savedRef.current), savePatch }
}

function SaveStateLabel({ state }: { state: SaveState }) {
  const { t } = useTranslation('procurements')
  return <span className={`text-xs ${state === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{t(state === 'saving' ? 'saving' : state === 'error' ? 'autosaveError' : 'saved')}</span>
}

function useAttachmentUrl(attachment: ProcurementAttachment) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => { let url: string | null = null; let cancelled = false; void authorizedRequest(attachment.url).then((response) => { if (!response.ok) throw new Error(); return response.blob() }).then((blob) => { if (cancelled) return; url = URL.createObjectURL(blob); setSrc(url) }).catch(() => undefined); return () => { cancelled = true; if (url) URL.revokeObjectURL(url) } }, [attachment.id, attachment.url])
  return src
}

function AttachmentPreview({ attachment, onDelete, sizeClass = 'size-16', hoverContent }: { attachment: ProcurementAttachment; onDelete: () => void; sizeClass?: string; hoverContent?: ReactNode }) {
  const src = useAttachmentUrl(attachment)
  return <div className={`group relative ${sizeClass} shrink-0`}>{src && attachment.contentType.startsWith('image/') ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt="" className={`${sizeClass} rounded-lg border object-cover`} /></a> : <div className={`flex ${sizeClass} items-center justify-center rounded-lg border bg-muted`}><FileText className="size-5 text-muted-foreground" /></div>}{hoverContent ? <div className="pointer-events-none absolute inset-0 flex items-end justify-center rounded-lg bg-black/0 opacity-0 transition-[opacity,background-color] duration-150 group-hover:pointer-events-auto group-hover:bg-black/35 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:bg-black/35 group-focus-within:opacity-100">{hoverContent}</div> : null}<Button type="button" variant="ghost" size="icon-xs" className="absolute -right-2 -top-2 z-10 size-6 rounded-full bg-[#E5E7EB] text-[#667085] hover:bg-[#D1D5DB] hover:text-[#111827]" onClick={onDelete}><X /></Button></div>
}

function DetailShell({ title, group, children }: { title: string; group: OrderGroup; children: ReactNode }) {
  const { t } = useTranslation('procurements')
  return <div className="mx-auto max-w-5xl space-y-5"><Button asChild variant="ghost" className="-ml-2"><Link to="/admin/procurements"><ArrowLeft />{t('board.back')}</Link></Button><div><h1 className="text-2xl font-bold">{title}</h1><div className="mt-2 flex items-center gap-2"><OrderBadge group={group} /><span className="text-sm text-muted-foreground">{t('board.itemCount', { count: group.rows.length })}</span></div></div>{children}</div>
}

function ProductImageEditor({ row, onError }: { row: ProcurementRow; onError: (message: string) => void }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  const updateRow = (image: Awaited<ReturnType<typeof ordersApi.uploadOrderItemImage>>) => {
    const primaryImageUrl = image.primaryImageUrl?.startsWith('/api/')
      ? `${image.primaryImageUrl}?v=${Date.now()}`
      : image.primaryImageUrl
    queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) =>
      value.id === row.id
        ? {
            ...value,
            productImageUrl: primaryImageUrl,
            hasManualImage: image.hasManualImage,
            hasPreviewImage: image.hasPreviewImage,
            previewImageSource: image.previewImageSource,
          }
        : value,
    ))
    void queryClient.invalidateQueries({ queryKey: ['procurements'] })
  }
  const upload = useMutation({
    mutationFn: (selected: File) => ordersApi.uploadOrderItemImage(row.orderItemId, selected),
    onSuccess: (image) => {
      updateRow(image)
      setFile(null)
      setPreviewUrl(null)
    },
    onError: (error) => onError(error instanceof ApiError ? error.message : t('productImage.uploadError')),
  })
  const remove = useMutation({
    mutationFn: () => ordersApi.deleteOrderItemImage(row.orderItemId),
    onSuccess: updateRow,
    onError: (error) => onError(error instanceof ApiError ? error.message : t('productImage.deleteError')),
  })
  return (
    <div className="group relative size-[220px] shrink-0">
      <Label className="sr-only">{t('productImage.label')}</Label>
      {previewUrl
        ? <img src={previewUrl} alt={t('productImage.previewAlt')} className="size-[220px] rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] object-cover" />
        : <ProductImage row={row} className="size-[220px] rounded-lg" />}
      {!file && row.hasManualImage ? <Button type="button" variant="ghost" size="icon-xs" aria-label={t('productImage.delete')} title={t('productImage.delete')} className="absolute -right-2 -top-2 z-20 size-6 rounded-full bg-[#E5E7EB] text-[#667085] hover:bg-[#D1D5DB] hover:text-[#111827]" onClick={() => remove.mutate()} disabled={remove.isPending}>{remove.isPending ? <LoaderCircle className="size-3 animate-spin" /> : <X />}</Button> : null}
      <div className={`absolute inset-0 flex items-end justify-center rounded-lg bg-black/0 opacity-0 transition-[opacity,background-color] duration-150 group-hover:bg-black/35 group-hover:opacity-100 group-focus-within:bg-black/35 group-focus-within:opacity-100 max-sm:bg-black/35 max-sm:opacity-100 ${upload.isPending ? 'pointer-events-auto bg-black/35 opacity-100' : 'pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto'}`}>
        {upload.isPending
          ? <span className="mb-2 flex h-8 items-center gap-1.5 text-xs text-white"><LoaderCircle className="size-3.5 animate-spin" />{t('uploading')}</span>
          : <Button asChild type="button" variant="ghost" size="sm" className="mb-1 h-8 rounded-lg border-0 bg-transparent px-2 text-xs text-white shadow-none transition-[transform,background-color,color] duration-150 hover:scale-105 hover:bg-white hover:text-[#111827]">
            <label className="cursor-pointer">
              <ImagePlus />
              {row.hasManualImage ? t('productImage.replace') : t('productImage.add')}
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const selected = event.target.files?.[0]
                  event.target.value = ''
                  if (!selected) return
                  if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
                    onError(t('productImage.unsupported'))
                    return
                  }
                  if (selected.size > 10 * 1024 * 1024) {
                    onError(t('productImage.tooLarge'))
                    return
                  }
                  if (previewUrl) URL.revokeObjectURL(previewUrl)
                  setFile(selected)
                  setPreviewUrl(URL.createObjectURL(selected))
                  upload.mutate(selected)
                }}
              />
            </label>
          </Button>}
      </div>
    </div>
  )
}

function ItemPurchaseEditor({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { saveState, isDirty, savePatch } = useRowForm(row, setError)
  const removeProcurement = useMutation({
    mutationFn: () => procurementsApi.deleteProcurement(row.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
      void queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      navigate('/admin/procurements', { replace: true })
    },
    onError: () => setError(t('removeError')),
  })
  const statusAction = useMutation({
    mutationFn: (status: ProcurementStatus) => procurementsApi.transitionProcurement(row.id, { status }),
    onSuccess: (updated) => {
      queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === updated.id ? updated : value))
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
      void queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    },
    onError: (mutationError) => setError(mutationError instanceof ApiError ? mutationError.message : t('board.moveError')),
  })
  const receipt = row.attachments.find((attachment) => attachment.kind === 'Receipt')
  const nextActionStatus = getNextProcurementActionStatus(row.status)
  const productUrl = safeProductUrl(row.productUrl)
  const upload = useMutation({ mutationFn: (file: File) => procurementsApi.uploadReceipt(row.id, file), onSuccess: (attachment) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: [...value.attachments.filter((item) => item.kind !== 'Receipt'), attachment] } : value)), onError: () => setError(t('uploadError')) })
  const remove = useMutation({ mutationFn: (attachmentId: string) => procurementsApi.deleteAttachment(row.id, attachmentId), onSuccess: (_, attachmentId) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: value.attachments.filter((item) => item.id !== attachmentId) } : value)), onError: () => setError(t('uploadError')) })
  return <section className="relative flex min-w-0 flex-col rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
    <Button type="button" variant="ghost" size="icon" aria-label={t('removeFromProcurement')} title={removeProcurement.isPending ? t('removing') : t('removeFromProcurement')} className="absolute right-3 top-3 z-10 size-8 rounded-lg text-[#667085] hover:bg-red-50 hover:text-red-600 sm:right-4 sm:top-4" disabled={removeProcurement.isPending || isDirty || saveState === 'saving'} onClick={() => { if (window.confirm(t('removeConfirm'))) removeProcurement.mutate() }}>
      {removeProcurement.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
    <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row">
      <ProductImageEditor row={row} onError={setError} />
      <div className="grid min-w-0 flex-1 gap-4 pt-1 pr-9">
        <div className="min-w-0 space-y-1.5">
          <Label className="text-sm text-muted-foreground">{t('fields.purchaseUrl')}</Label>
          <InlinePurchaseUrl value={row.purchaseUrl} disabled={saveState === 'saving'} onSave={(purchaseUrl) => savePatch({ purchaseUrl })} onEditStart={() => setError('')} />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label className="text-sm text-muted-foreground">{t('fields.purchasePrice')}</Label>
          <InlinePurchasePrice value={row.purchasePrice} currency={row.purchaseCurrencyCode ?? 'JPY'} disabled={saveState === 'saving'} onSave={(purchasePrice, purchaseCurrencyCode) => savePatch({ purchasePrice, purchaseCurrencyCode })} onEditStart={() => setError('')} />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-3">
            {receipt ? <AttachmentPreview attachment={receipt} sizeClass="size-20" onDelete={() => remove.mutate(receipt.id)} hoverContent={<Button asChild type="button" variant="ghost" size="sm" className="h-8 rounded-lg border-0 bg-transparent px-2 text-xs text-white shadow-none transition-[transform,background-color,color] duration-150 hover:scale-105 hover:bg-white hover:text-[#111827]"><label className="cursor-pointer"><ImagePlus />{t('replaceReceipt')}<input type="file" className="sr-only" accept="image/*,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) upload.mutate(file) }} /></label></Button>} /> : <Button asChild type="button" variant="ghost" size="sm" className="h-8 rounded-lg border-0 bg-transparent px-2 text-xs shadow-none hover:bg-transparent"><label className="cursor-pointer"><ImagePlus />{t('addReceipt')}<input type="file" className="sr-only" accept="image/*,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) upload.mutate(file) }} /></label></Button>}
          </div>
        </div>
        {row.itemDescription && row.itemName !== productTitle(row) ? <p className="mt-1 break-words text-sm leading-5 text-[#667085]">{row.itemDescription}</p> : null}
        {productUrl ? <a href={productUrl.href} target="_blank" rel="noopener noreferrer" title={row.productUrl ?? undefined} className="mt-2 flex min-w-0 items-center gap-1 text-xs text-[#667085] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="truncate">{compactProductUrl(row.productUrl!)}</span><ExternalLink className="size-3 shrink-0" /></a> : null}
      </div>
    </div>
    <div className="mt-12">
      <LifecycleProgressStepper row={row} compact />
    </div>
    {error ? <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <div className="mt-auto pt-4">
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Этапы</h3>
        <ul className="space-y-1.5">
          {['purchase', 'receiveOrigin', 'sendTransit', 'receiveTransit', 'sendMoscow', 'receiveMoscow', 'sendCustomer'].map((task, index) => {
            const completedCount = completedTodoCount[row.status]
            const complete = index < completedCount
            const active = index === completedCount && completedCount < 7
            return <li key={task} aria-current={active ? 'step' : undefined} className={`flex min-w-0 items-center gap-2 text-xs ${active ? 'font-medium text-[#344054]' : complete ? 'text-[#9CA3AF]' : 'text-[#B8BEC8]'}`}>
              <span aria-hidden="true" className={`flex size-4 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-emerald-600 text-white' : active ? 'border-2 border-blue-500 bg-blue-50' : 'border border-[#E5E7EB]'}`}>{complete ? <Check className="size-2.5" strokeWidth={3} /> : active ? <span className="size-1.5 rounded-full bg-blue-600" /> : null}</span>
              <span className="min-w-0 flex-1">{t(`purchaseTodo.${task}`)}</span>
              {task === 'purchase' && row.status === 'Purchased' ? <button type="button" className="shrink-0 whitespace-nowrap bg-transparent px-0 text-[10px] font-medium text-[#111827] hover:underline disabled:opacity-50" disabled={statusAction.isPending} onClick={() => statusAction.mutate('RequiredPurchase')}>{t('actions.undoPurchase')}</button> : null}
            </li>
          })}
        </ul>
        {nextActionStatus ? <div className="flex justify-end pt-2"><Button type="button" className="h-10 rounded-lg bg-[#111827] px-3 text-xs font-medium text-white hover:bg-slate-700" disabled={statusAction.isPending} onClick={() => statusAction.mutate(nextActionStatus)}>{statusAction.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}{statusAction.isPending ? t('board.updating') : t(`actions.${nextActionStatus}`)}</Button></div> : null}
      </div>
    </div>
  </section>
}

function WarehouseEditor({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const { form, setForm, saveState } = useRowForm(row, setError)
  const photos = row.attachments.filter((attachment) => attachment.kind === 'WarehousePhoto')
  const upload = useMutation({ mutationFn: (files: File[]) => procurementsApi.uploadWarehousePhotos(row.id, files), onSuccess: (attachments) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: [...value.attachments, ...attachments] } : value)), onError: () => setError(t('uploadError')) })
  const remove = useMutation({ mutationFn: (attachmentId: string) => procurementsApi.deleteAttachment(row.id, attachmentId), onSuccess: (_, attachmentId) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: value.attachments.filter((item) => item.id !== attachmentId) } : value)), onError: () => setError(t('uploadError')) })
  return <StageEditorCard row={row} error={error} state={saveState}><Field label={t('fields.warehouseTrackingNumber')} id={`${row.id}-track`}><CopyField id={`${row.id}-track`} value={form.warehouseTrackingNumber ?? ''} onChange={(warehouseTrackingNumber) => setForm((value) => ({ ...value, warehouseTrackingNumber: emptyToNull(warehouseTrackingNumber) }))} /></Field><Field label={t('fields.warehouseReceivedAt')} id={`${row.id}-date`}><Input id={`${row.id}-date`} className="h-9 bg-white" type="date" value={form.warehouseReceivedAt ?? ''} onChange={(event) => setForm((value) => ({ ...value, warehouseReceivedAt: emptyToNull(event.target.value) }))} /></Field><div className="space-y-2 sm:col-span-2"><Label className="text-sm text-muted-foreground">{t('fields.warehousePhotos')}</Label><div className="flex flex-wrap items-center gap-3">{photos.map((photo) => <AttachmentPreview key={photo.id} attachment={photo} onDelete={() => remove.mutate(photo.id)} />)}<Button asChild variant="outline" size="sm"><label className="cursor-pointer"><ImagePlus />{t('addPhotos')}<input type="file" className="sr-only" multiple accept="image/*" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; if (files.length) upload.mutate(files) }} /></label></Button></div></div></StageEditorCard>
}

function ShippingEditor({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const [error, setError] = useState('')
  const { form, setForm, saveState } = useRowForm(row, setError)
  return <StageEditorCard row={row} error={error} state={saveState}><Field label={t('fields.shippingTrackingNumber')} id={`${row.id}-track`}><CopyField id={`${row.id}-track`} value={form.shippingTrackingNumber ?? ''} onChange={(shippingTrackingNumber) => setForm((value) => ({ ...value, shippingTrackingNumber: emptyToNull(shippingTrackingNumber) }))} /></Field><Field label={t('fields.shippingMethod')} id={`${row.id}-method`}><Input id={`${row.id}-method`} className="h-9 bg-white" value={form.shippingMethod ?? ''} onChange={(event) => setForm((value) => ({ ...value, shippingMethod: emptyToNull(event.target.value) }))} /></Field><Field label={t('fields.shippingWeight')} id={`${row.id}-weight`}><Input id={`${row.id}-weight`} className="h-9 bg-white" inputMode="decimal" value={form.shippingWeight ?? ''} onChange={(event) => setForm((value) => ({ ...value, shippingWeight: numberOrNull(event.target.value) }))} /></Field><Field label={t('fields.shippingCost')} id={`${row.id}-cost`}><MoneyField id={`${row.id}-cost`} value={form.shippingCost} currency={form.shippingCurrencyCode} onValue={(shippingCost) => setForm((value) => ({ ...value, shippingCost }))} onCurrency={(shippingCurrencyCode) => setForm((value) => ({ ...value, shippingCurrencyCode }))} /></Field><Field label={t('fields.shippedAt')} id={`${row.id}-date`}><Input id={`${row.id}-date`} className="h-9 bg-white" type="date" value={form.shippedAt ?? ''} onChange={(event) => setForm((value) => ({ ...value, shippedAt: emptyToNull(event.target.value) }))} /></Field></StageEditorCard>
}

function StageEditorCard({ row, error, state, children }: { row: ProcurementRow; error: string; state: SaveState; children: ReactNode }) {
  return <section className="rounded-xl border bg-card p-4"><div className="mb-4 flex items-center gap-3"><ProductImage row={row} className="size-14" /><div className="min-w-0"><h2 className="truncate font-semibold">{row.itemName}</h2>{row.itemDescription ? <p className="truncate text-sm text-muted-foreground">{row.itemDescription}</p> : null}</div></div>{error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}<div className="grid gap-4 sm:grid-cols-2">{children}</div><div className="mt-4"><SaveStateLabel state={state} /></div></section>
}

function CompletedSummary({ group }: { group: OrderGroup }) {
  const { t } = useTranslation('procurements')
  return <div className="rounded-xl border bg-card p-4"><div className="space-y-3">{group.rows.map((row, index) => <OrderItemPreview key={row.id} row={row} position={index + 1} total={group.rows.length} />)}</div><div className="mt-4 grid gap-2 border-t pt-4 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">{t('fields.shippingMethod')}:</span> {group.rows.find((row) => row.shippingMethod)?.shippingMethod ?? '—'}</p><p><span className="text-muted-foreground">{t('fields.shippingTrackingNumber')}:</span> {group.rows.find((row) => row.shippingTrackingNumber)?.shippingTrackingNumber ?? '—'}</p><p><span className="text-muted-foreground">{t('board.delivered')}:</span> {group.rows.find((row) => row.shippedAt)?.shippedAt ?? '—'}</p></div></div>
}

export function ProcurementItemDetailPage() {
  const { t } = useTranslation('procurements')
  const { procurementId } = useParams()
  const query = useAllProcurements()
  const row = query.data?.find((value) => value.id === procurementId)
  const group = query.data ? groupOrders(query.data).find((value) => value.orderId === row?.orderId) : undefined
  if (query.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />
  if (!row || !group) return <Alert variant="destructive"><AlertDescription>{t('board.notFound')}</AlertDescription></Alert>
  return <div className="mx-auto w-full max-w-7xl space-y-5">
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <Button asChild variant="ghost" className="-ml-2 h-9 shrink-0 rounded-lg px-2 text-sm text-[#667085] hover:text-[#111827]"><Link to="/admin/procurements"><ArrowLeft />{t('board.back')}</Link></Button>
      <header className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <OrderBadge group={group} className="text-[25px] font-thin leading-8" />
        <h1 className="min-w-0 break-words text-2xl font-medium tracking-tight text-[#111827]">{productTitle(row)}</h1>
      </header>
    </div>
    <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <ItemPurchaseEditor row={row} />
      </div>
      <ProcurementCommentsChat procurementId={row.id} variant="embedded" composerSize="comfortable" />
    </div>
  </div>
}

export function ProcurementOrderDetailPage() {
  const { t } = useTranslation('procurements')
  const { orderId, stage } = useParams()
  const query = useAllProcurements()
  const group = query.data ? groupOrders(query.data).find((value) => value.orderId === orderId) : undefined
  if (query.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />
  if (!group) return <Alert variant="destructive"><AlertDescription>{t('board.notFound')}</AlertDescription></Alert>
  const currentStage = stages.includes(stage as BoardStage) ? stage as BoardStage : group.stage
  return <DetailShell title={t('board.orderCard')} group={group}>{currentStage === 'originWarehouse' || currentStage === 'transit' || currentStage === 'moscow' ? <div className="space-y-4">{group.rows.map((row) => <WarehouseEditor key={row.id} row={row} />)}</div> : currentStage === 'customerDelivery' ? <div className="space-y-4">{group.rows.map((row) => <ShippingEditor key={row.id} row={row} />)}</div> : <CompletedSummary group={group} />}</DetailShell>
}

