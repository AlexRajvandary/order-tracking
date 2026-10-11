import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui'
import {
  ArrowLeft,
  Archive,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  FileText,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as ordersApi from '@/features/orders/api/ordersApi'
import * as procurementsApi from '@/features/procurements/api/procurementsApi'
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
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Card, CardContent } from '@/shared/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'

const currencies: ProcurementCurrencyCode[] = ['JPY', 'RUB', 'USD', 'EUR']
const currencySymbols: Record<ProcurementCurrencyCode, string> = { JPY: '¥', RUB: '₽', USD: '$', EUR: '€' }
const stages: Exclude<ProcurementStage, 'archive'>[] = ['purchase', 'originWarehouse', 'transit', 'moscow', 'customerDelivery']
const autoSaveDelayMs = 650

type BoardStage = typeof stages[number]
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type OrderGroup = { orderId: string; trackingCode: string; rows: ProcurementRow[]; stage: BoardStage }
type ActiveProcurementDrag = { rowId: string; sourceStage: BoardStage; allowedStages: ProcurementStage[]; width: number; offsetX: number }
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
  onDragStart({ rowId: row.id, sourceStage: deriveItemStage(row), allowedStages: [row.nextStage, row.previousStage].filter((stage): stage is ProcurementStage => Boolean(stage)), width: rect.width, offsetX })
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

function OrderBadge({ group }: { group: Pick<OrderGroup, 'orderId' | 'trackingCode'> }) {
  return <span className="block max-w-full truncate text-[11px] font-semibold text-[#111827]" title={group.trackingCode}>{group.trackingCode}</span>
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

function LifecycleProgressStepper({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const current = statusProgressIndex[row.status]
  return <div className="mx-[-8px] mt-2 pt-2 pb-1.5">
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
          <span className={`mt-1.5 whitespace-nowrap text-center text-[9px] leading-tight ${active ? 'font-medium text-blue-600' : complete ? 'text-slate-500' : 'text-slate-400'}`}>{t(`board.stepper.${stage}`)}</span>
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
  useEffect(() => {
    if (!issueSaved) return
    const timer = window.setTimeout(() => setIssueSaved(false), 3000)
    return () => window.clearTimeout(timer)
  }, [issueSaved])
  const report = useMutation({
    mutationFn: () => procurementsApi.createProcurementError(row.id, errorText, false),
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
    {row.nextStatus ? <div className="space-y-1.5"><Button size="sm" className={`${compactPrimary ? 'h-[22px] min-w-0 w-full overflow-hidden rounded-[5px] whitespace-nowrap' : 'h-11 w-full rounded-[10px]'} gap-[10px] bg-[#111827] text-[9px] font-semibold text-white shadow-none transition-colors hover:bg-slate-700 active:bg-slate-800`} disabled={transitioning} title={t(`actions.${row.nextStatus}`)} onClick={() => transition(row.nextStatus!)}>{transitioning ? <><LoaderCircle className="animate-spin motion-reduce:animate-none" />{t('board.updating')}</> : t(`actions.${row.nextStatus}`)}</Button></div> : null}
    {issueSaved ? <p role="status" className="text-[11px] text-emerald-700">{t('board.errorSaved')}</p> : null}
    {showErrorForm && !onOpenComment ? <div className="animate-in fade-in-0 slide-in-from-top-1 space-y-2 rounded-lg bg-muted/50 p-2 duration-200"><textarea value={errorText} onChange={(event) => setErrorText(event.target.value)} maxLength={2000} rows={2} placeholder={t('board.errorPlaceholder')} className="w-full resize-y rounded-md border bg-background p-2 text-sm" />{error ? <p className="text-xs text-destructive">{error}</p> : null}<div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setShowErrorForm(false)}>{t('cancel')}</Button><Button size="sm" disabled={!errorText.trim() || report.isPending} onClick={() => report.mutate()}>{t('board.sendError')}</Button></div></div> : null}
  </div>
}

function PurchaseItemCard({ group, row, position, onDragStart, onDragEnd, onTransition }: { group: OrderGroup; row: ProcurementRow; position: number; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [undoingPurchase, setUndoingPurchase] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const input = commentInputRef.current
    if (!input) return
    input.style.height = '28px'
    const maxHeight = 136
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [commentText, commentOpen])
  const url = safeProductUrl(row.productUrl)
  const meta = [formatMoney(row.purchasePrice ?? row.unitPrice, row.purchasePrice == null ? row.itemCurrencyCode as ProcurementCurrencyCode | null : row.purchaseCurrencyCode)].filter(Boolean)
  const commentsQuery = useQuery({
    queryKey: ['procurement-errors', row.id],
    queryFn: ({ signal }) => procurementsApi.getProcurementErrors(row.id, signal),
    enabled: commentOpen,
  })
  const commentMutation = useMutation({
    mutationFn: () => procurementsApi.createProcurementError(row.id, commentText, false),
    onSuccess: () => {
      setCommentText('')
      setCommentError('')
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
      void queryClient.invalidateQueries({ queryKey: ['procurement-errors', row.id] })
    },
    onError: (error) => setCommentError(error instanceof ApiError ? error.message : t('board.errorCreateFailed')),
  })
  const deleteCommentMutation = useMutation({
    mutationFn: procurementsApi.deleteProcurementError,
    onSuccess: () => {
      setCommentError('')
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
      void queryClient.invalidateQueries({ queryKey: ['procurement-errors', row.id] })
    },
    onError: (error) => setCommentError(error instanceof ApiError ? error.message : t('board.errorDeleteFailed')),
  })
  const undoPurchase = () => {
    if (undoingPurchase) return
    const operation = onTransition(row, 'RequiredPurchase')
    if (!operation) return
    setUndoingPurchase(true)
    void operation.then(() => setUndoingPurchase(false), () => setUndoingPurchase(false))
  }
  useEffect(() => {
    if (commentOpen) commentInputRef.current?.focus()
  }, [commentOpen])
  return (
    <article data-procurement-item draggable onDragStart={(event) => startItemDrag(event, row, onDragStart)} onDragEnd={onDragEnd} className="cursor-grab overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#FAFAFB] px-2 py-[14px] shadow-[0_2px_8px_rgba(16,24,40,0.06)] transition-[box-shadow,border-color] duration-150 hover:border-slate-300 hover:shadow-[0_3px_10px_rgba(16,24,40,0.09)] active:cursor-grabbing motion-reduce:transition-none">
      <div className="relative">
      <div inert={commentOpen} className={`transition-transform duration-300 ease-in-out motion-reduce:transition-none ${commentOpen ? '-translate-x-[150%] pointer-events-none' : 'translate-x-0'}`}>
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><OrderBadge group={group} /><span className="shrink-0 text-[10px] text-[#9CA3AF]">{t('board.positionShort', { current: position, total: group.rows.length })}</span></div><div className="mt-[3px] flex items-center gap-2"><p className={`min-w-0 break-words leading-4 ${row.status === 'RequiredPurchase' || row.status === 'Purchased' || row.status === 'AwaitingWarehouse' || row.status === 'AwaitingTransitShipment' || row.status === 'AwaitingMoscowShipment' ? 'text-[9px]' : 'text-[12px]'} ${row.status === 'RequiredPurchase' ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`} title={t(`statuses.lifecycle.${row.status}`)}>{t(`statuses.lifecycle.${row.status}`)}</p>{row.status === 'Purchased' ? <button type="button" className="shrink-0 text-[9px] text-muted-foreground underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-50" disabled={undoingPurchase} onClick={(event) => { event.stopPropagation(); undoPurchase() }}>{t('actions.undoPurchaseShort')}</button> : null}</div></div>
        <div className="ml-auto shrink-0 [&_button]:size-9"><CardMenu row={row} group={group} /></div>
      </div>
      <div className="mt-3 flex min-w-0 items-stretch gap-1.5">
        <Link to={`/admin/procurements/items/${row.id}`} aria-label={t('board.openItem')} className="shrink-0 rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ProductImage row={row} className="size-[94px]" /></Link>
        <div className="flex min-h-[94px] min-w-0 flex-1 flex-col">
          <Link to={`/admin/procurements/items/${row.id}`} className="block rounded-sm text-[10px] font-semibold leading-3 text-[#111827] line-clamp-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={productTitle(row)}>{productTitle(row)}</Link>
          {url ? <a href={url.href} target="_blank" rel="noopener noreferrer" title={row.productUrl ?? undefined} className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-[#667085] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="truncate">{compactProductUrl(row.productUrl!)}</span><ExternalLink className="size-3 shrink-0" /></a> : null}
          <div className="mt-1 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-[#6B7280]" title={meta.join(' · ')}>{meta.map((value, index) => <span key={`${row.id}-meta-${index}`} className="min-w-0 truncate">{value}</span>)}</div>
          <LifecycleActions row={row} onTransition={onTransition} compactPrimary onOpenComment={() => { setCommentError(''); setCommentOpen(true) }} />
        </div>
      </div>
      <ProcurementContext row={row} />
      <LifecycleProgressStepper row={row} />
      </div>
      <section data-no-drag aria-label={t('board.commentTitle')} aria-hidden={!commentOpen} inert={!commentOpen} className={`absolute -inset-x-2 top-[-14px] z-20 bg-[#E5E7EB] transition-[transform,opacity] duration-300 ease-in-out motion-reduce:transition-none ${commentOpen ? 'bottom-[-14px] translate-x-0 pointer-events-auto opacity-100' : 'bottom-0 translate-x-[150%] pointer-events-none opacity-0'}`}>
        <button type="button" aria-label={t('board.backToCard')} title={t('board.backToCard')} className="absolute left-2 top-2 z-30 flex size-5 items-center justify-center rounded-full bg-white/95 text-[#667085] shadow-sm hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setCommentOpen(false)}><ArrowLeft className="size-3" /></button>
        {commentError ? <p role="alert" className="absolute bottom-[42px] left-2 right-2 z-30 text-xs text-destructive">{commentError}</p> : null}
        <div aria-live="polite" className="procurement-comment-scrollbar absolute inset-0 flex flex-col gap-2 overflow-y-auto px-2 pb-[152px]">
          {commentsQuery.isLoading ? <Skeleton className="ml-auto h-10 w-3/4 rounded-2xl" /> : commentsQuery.isError ? <p role="alert" className="text-[10px] text-destructive">{t('board.errorsLoadFailed')}</p> : commentsQuery.data?.length ? commentsQuery.data.map((comment) => <ContextMenuPrimitive.Root key={comment.id}>
            <ContextMenuPrimitive.Trigger asChild><div className="ml-auto flex max-w-[90%] cursor-context-menu flex-col rounded-2xl rounded-br-sm bg-[#111827] px-2.5 py-1.5 text-white"><p className="whitespace-pre-wrap break-words text-[10px] leading-4">{comment.text}</p><time className="mt-0.5 self-end text-[8px] text-slate-300" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time></div></ContextMenuPrimitive.Trigger>
            <ContextMenuPrimitive.Portal><ContextMenuPrimitive.Content className="z-[100] min-w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none"><ContextMenuPrimitive.Item disabled={deleteCommentMutation.isPending} onSelect={() => deleteCommentMutation.mutate(comment.id)} className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive outline-none focus:bg-destructive/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"><Trash2 className="size-3.5" />{t('board.deleteComment')}</ContextMenuPrimitive.Item></ContextMenuPrimitive.Content></ContextMenuPrimitive.Portal>
          </ContextMenuPrimitive.Root>) : <p className="my-auto text-center text-[10px] text-[#9CA3AF]">{t('board.noComments')}</p>}
        </div>
        <div className="absolute inset-x-2 bottom-[6px] z-20 w-auto overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <textarea ref={commentInputRef} value={commentText} onChange={(event) => { setCommentText(event.target.value); setCommentError('') }} maxLength={2000} rows={1} placeholder={t('board.commentPlaceholder')} className="procurement-comment-scrollbar block max-h-[136px] min-h-7 w-[calc(100%-28px)] resize-none rounded-l-xl border-0 bg-transparent px-2 py-[7px] pr-0 text-left text-[10px] leading-3 outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
          <Button type="button" size="icon" aria-label={t('board.saveComment')} title={t('board.saveComment')} className="pointer-events-auto absolute right-1 top-1/2 z-10 size-5 -translate-y-1/2 rounded-full bg-[#111827] p-0 text-white hover:bg-slate-700" disabled={!commentText.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate()}>{commentMutation.isPending ? <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" /> : <ArrowUp className="size-3" />}</Button>
        </div>
      </section>
      </div>
    </article>
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
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const compactAction = row.nextStatus === 'AtOriginWarehouse' || row.nextStatus === 'AwaitingTransitShipment' || row.nextStatus === 'SentToTransit' || row.nextStatus === 'SentToMoscow'
  const commentsQuery = useQuery({
    queryKey: ['procurement-errors', row.id],
    queryFn: ({ signal }) => procurementsApi.getProcurementErrors(row.id, signal),
    enabled: commentOpen,
  })
  const createComment = useMutation({
    mutationFn: () => procurementsApi.createProcurementError(row.id, commentText, false),
    onSuccess: () => {
      setCommentText('')
      setCommentError('')
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
      void queryClient.invalidateQueries({ queryKey: ['procurement-errors', row.id] })
    },
    onError: (error) => setCommentError(error instanceof ApiError ? error.message : t('board.errorCreateFailed')),
  })
  const deleteComment = useMutation({
    mutationFn: procurementsApi.deleteProcurementError,
    onSuccess: () => {
      setCommentError('')
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
      void queryClient.invalidateQueries({ queryKey: ['procurement-errors', row.id] })
    },
    onError: (error) => setCommentError(error instanceof ApiError ? error.message : t('board.errorDeleteFailed')),
  })
  useEffect(() => {
    const input = commentInputRef.current
    if (!input) return
    input.style.height = '28px'
    const maxHeight = 136
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [commentText, commentOpen])
  useEffect(() => {
    if (commentOpen) commentInputRef.current?.focus()
  }, [commentOpen])
  return <div data-procurement-item draggable onDragStart={(event) => startItemDrag(event, row, onDragStart)} onDragEnd={onDragEnd} className={`cursor-grab active:cursor-grabbing ${position > 1 ? 'pt-3' : ''}`}>
    <div className="relative">
      <div inert={commentOpen} className={`transition-transform duration-300 ease-in-out motion-reduce:transition-none ${commentOpen ? '-translate-x-[150%] pointer-events-none' : 'translate-x-0'}`}>
        <OrderItemPreview row={row} position={position} total={group.rows.length} compactAction={compactAction} hidePosition={stage === 'originWarehouse'} hideStatus onTransition={onTransition} onOpenComment={() => { setCommentError(''); setCommentOpen(true); onCommentOpenChange(row.id, true) }} />
        <ProcurementContext row={row} />
        <LifecycleProgressStepper row={row} />
        {!compactAction ? <LifecycleActions row={row} onTransition={onTransition} onOpenComment={() => { setCommentError(''); setCommentOpen(true); onCommentOpenChange(row.id, true) }} /> : null}
      </div>
      <section data-no-drag aria-label={t('board.commentTitle')} aria-hidden={!commentOpen} inert={!commentOpen} className={`absolute -inset-x-2 top-[-14px] z-20 bg-[#E5E7EB] transition-[transform,opacity] duration-300 ease-in-out motion-reduce:transition-none ${commentOpen ? 'bottom-[-14px] translate-x-0 pointer-events-auto opacity-100' : 'bottom-0 translate-x-[150%] pointer-events-none opacity-0'}`}>
        <button type="button" aria-label={t('board.backToCard')} title={t('board.backToCard')} className="absolute left-2 top-2 z-30 flex size-5 items-center justify-center rounded-full bg-white/95 text-[#667085] shadow-sm hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setCommentOpen(false); onCommentOpenChange(row.id, false) }}><ArrowLeft className="size-3" /></button>
        {commentError ? <p role="alert" className="absolute bottom-[42px] left-2 right-2 z-30 text-xs text-destructive">{commentError}</p> : null}
        <div aria-live="polite" className="procurement-comment-scrollbar absolute inset-0 flex flex-col gap-2 overflow-y-auto px-2 pb-[152px]">
          {commentsQuery.isLoading ? <Skeleton className="ml-auto h-10 w-3/4 rounded-2xl" /> : commentsQuery.isError ? <p role="alert" className="text-[10px] text-destructive">{t('board.errorsLoadFailed')}</p> : commentsQuery.data?.length ? commentsQuery.data.map((comment) => <ContextMenuPrimitive.Root key={comment.id}>
            <ContextMenuPrimitive.Trigger asChild><div className="ml-auto flex max-w-[90%] cursor-context-menu flex-col rounded-2xl rounded-br-sm bg-[#111827] px-2.5 py-1.5 text-white"><p className="whitespace-pre-wrap break-words text-[10px] leading-4">{comment.text}</p><time className="mt-0.5 self-end text-[8px] text-slate-300" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time></div></ContextMenuPrimitive.Trigger>
            <ContextMenuPrimitive.Portal><ContextMenuPrimitive.Content className="z-[100] min-w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none"><ContextMenuPrimitive.Item disabled={deleteComment.isPending} onSelect={() => deleteComment.mutate(comment.id)} className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive outline-none focus:bg-destructive/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"><Trash2 className="size-3.5" />{t('board.deleteComment')}</ContextMenuPrimitive.Item></ContextMenuPrimitive.Content></ContextMenuPrimitive.Portal>
          </ContextMenuPrimitive.Root>) : <p className="my-auto text-center text-[10px] text-[#9CA3AF]">{t('board.noComments')}</p>}
        </div>
        <div className="absolute inset-x-2 bottom-[6px] z-20 w-auto overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <textarea ref={commentInputRef} value={commentText} onChange={(event) => { setCommentText(event.target.value); setCommentError('') }} maxLength={2000} rows={1} placeholder={t('board.commentPlaceholder')} className="procurement-comment-scrollbar block max-h-[136px] min-h-7 w-[calc(100%-28px)] resize-none rounded-l-xl border-0 bg-transparent px-2 py-[7px] pr-0 text-left text-[10px] leading-3 outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
          <Button type="button" size="icon" aria-label={t('board.saveComment')} title={t('board.saveComment')} className="pointer-events-auto absolute right-1 top-1/2 z-10 size-5 -translate-y-1/2 rounded-full bg-[#111827] p-0 text-white hover:bg-slate-700" disabled={!commentText.trim() || createComment.isPending} onClick={() => createComment.mutate()}>{createComment.isPending ? <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" /> : <ArrowUp className="size-3" />}</Button>
        </div>
      </section>
    </div>
  </div>
}

function OrderCard({ group, stage, onDragStart, onDragEnd, onTransition }: { group: OrderGroup; stage: Exclude<BoardStage, 'purchase'>; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const { t } = useTranslation('procurements')
  const [activeCommentRowId, setActiveCommentRowId] = useState<string | null>(null)
  const total = orderTotal(group.rows)
  return <article className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFB] px-2 py-[14px] shadow-[0_2px_8px_rgba(16,24,40,0.06)] transition-[box-shadow,border-color] duration-150 hover:border-slate-300 hover:shadow-[0_3px_10px_rgba(16,24,40,0.09)] motion-reduce:transition-none">
    <div className="overflow-hidden"><div inert={activeCommentRowId !== null} className={`flex items-start gap-2 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${activeCommentRowId !== null ? '-translate-x-[150%] pointer-events-none' : 'translate-x-0'}`}><Link to={`/admin/procurements/orders/${group.orderId}/${stage}`} className="flex min-w-0 flex-1 flex-col rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><OrderBadge group={group} /><span className={`mt-[3px] break-words leading-4 ${stage === 'originWarehouse' ? 'text-[9px]' : group.rows[0]?.status === 'RequiredPurchase' || group.rows[0]?.status === 'Purchased' || group.rows[0]?.status === 'AwaitingWarehouse' || group.rows[0]?.status === 'AwaitingTransitShipment' || group.rows[0]?.status === 'AwaitingMoscowShipment' ? 'text-[9px]' : 'text-[12px]'} ${group.rows[0]?.status === 'RequiredPurchase' ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>{group.rows[0] ? t(`statuses.lifecycle.${group.rows[0].status}`) : ''}</span></Link>{group.rows[0] ? <div className="ml-auto shrink-0 [&_button]:size-9"><CardMenu row={group.rows[0]} group={group} /></div> : null}</div></div>
    <div className={`mt-3 ${stage === 'originWarehouse' ? '' : 'divide-y divide-[#EAECF0]'}`}>{group.rows.map((row, index) => {
      const compactAction = row.nextStatus === 'AtOriginWarehouse' || row.nextStatus === 'AwaitingTransitShipment' || row.nextStatus === 'SentToTransit' || row.nextStatus === 'SentToMoscow'
      if (stage === 'originWarehouse' || stage === 'transit' || stage === 'moscow') return <CommentableOrderItem key={row.id} group={group} row={row} position={index + 1} stage={stage} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} onCommentOpenChange={(rowId, open) => setActiveCommentRowId((current) => open ? rowId : current === rowId ? null : current)} />
      return <div key={row.id} data-procurement-item draggable onDragStart={(event) => startItemDrag(event, row, onDragStart)} onDragEnd={onDragEnd} className={`cursor-grab active:cursor-grabbing ${index ? 'pt-3' : ''}`}>
        <OrderItemPreview row={row} position={index + 1} total={group.rows.length} compactAction={compactAction} hidePosition={stage === 'originWarehouse'} hideStatus={stage === 'transit'} onTransition={onTransition} />
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

function BoardLane({ stage, groups, mobile = false, dropStage, onDragStart, onDragEnd, onTransition }: { stage: BoardStage; groups: OrderGroup[]; mobile?: boolean; dropStage: BoardStage | null; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const { t } = useTranslation('procurements')
  const purchaseRows = stage === 'purchase' ? groups.flatMap((group) => group.rows.map((row, index) => ({ group, row, position: index + 1 }))) : []
  const count = groups.reduce((sum, group) => sum + group.rows.length, 0)
  return (
    <section
      data-procurement-stage={stage}
      className={`min-h-[50dvh] min-w-0 rounded-2xl px-0 py-2 transition-colors ${dropStage === stage ? 'bg-muted/70 ring-2 ring-muted-foreground/10' : ''}`}
    >
      <div className={`mb-3 flex items-center gap-2 ${mobile ? 'min-h-9 justify-between' : 'h-8 justify-start'}`}><h2 className={mobile ? 'text-xl font-semibold tracking-tight' : 'text-sm font-semibold'}>{t(`board.stages.${stage}`)}</h2><span className={mobile ? 'text-sm text-muted-foreground' : 'text-xs text-muted-foreground'}>{t('board.positionCount', { count })}</span></div>
      {stage === 'moscow' ? <MoscowGroups groups={groups} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} /> : <div className="space-y-1">{stage === 'purchase' ? purchaseRows.map((item) => <PurchaseItemCard key={item.row.id} {...item} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} />) : groups.map((group) => <OrderCard key={group.orderId} group={group} stage={stage} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} />)}</div>}
      {!count ? <EmptyLane purchase={stage === 'purchase'} /> : null}
    </section>
  )
}

function BoardSkeleton() {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">{stages.map((stage) => <div key={stage}><Skeleton className="mb-3 h-8 w-36" /><div className="space-y-3"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-52 rounded-xl" /></div></div>)}</div>
}

function DesktopBoard({ groups, activeDrag, onMove, onDragStart, onDragEnd, onTransition }: { groups: OrderGroup[]; activeDrag: ActiveProcurementDrag | null; onMove: (rowId: string, stage: BoardStage) => void; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const drop = useColumnDropTarget(activeDrag, onMove)
  return <div className="grid grid-cols-5 items-start gap-1" onDragOver={drop.onDragOver} onDragLeave={drop.onDragLeave} onDrop={drop.onDrop}>{stages.map((stage) => <BoardLane key={stage} stage={stage} groups={groupsForStage(groups, stage)} dropStage={drop.dropStage} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} />)}</div>
}

function MobileBoard({ groups, activeDrag, onMove, onDragStart, onDragEnd, onTransition }: { groups: OrderGroup[]; activeDrag: ActiveProcurementDrag | null; onMove: (rowId: string, stage: BoardStage) => void; onDragStart: (drag: ActiveProcurementDrag) => void; onDragEnd: () => void; onTransition: TransitionAction }) {
  const { t } = useTranslation('procurements')
  const [active, setActive] = useState<BoardStage>('purchase')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const activate = (stage: BoardStage) => { setActive(stage); const index = stages.indexOf(stage); scrollerRef.current?.scrollTo({ left: index * scrollerRef.current.clientWidth, behavior: 'smooth' }) }
  const syncFromScroll = () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); animationRef.current = requestAnimationFrame(() => { const scroller = scrollerRef.current; if (!scroller?.clientWidth) return; setActive(stages[Math.max(0, Math.min(stages.length - 1, Math.round(scroller.scrollLeft / scroller.clientWidth)))]) }) }
  const countFor = (stage: BoardStage) => groupsForStage(groups, stage).reduce((sum, group) => sum + group.rows.length, 0)
  const drop = useColumnDropTarget(activeDrag, onMove)
  return (
    <Tabs value={active} onValueChange={(value) => activate(value as BoardStage)} className="min-w-0 gap-4">
      <TabsList className="grid h-12 w-full grid-cols-5 rounded-2xl p-1">{stages.map((stage) => <TabsTrigger key={stage} value={stage} className="group min-w-0 gap-1 rounded-xl px-1 text-[10px] sm:text-xs"><span className="truncate">{t(`board.mobileStages.${stage}`)}</span><span className="rounded-full bg-background/70 px-1.5 text-[10px] tabular-nums group-data-[state=active]:bg-blue-50 group-data-[state=active]:text-blue-700">{countFor(stage)}</span></TabsTrigger>)}</TabsList>
      <div ref={scrollerRef} data-procurement-scroll className="flex min-h-[calc(100dvh-13rem)] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x touch-pan-y [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onScroll={syncFromScroll} onDragOver={drop.onDragOver} onDragLeave={drop.onDragLeave} onDrop={drop.onDrop}>
        {stages.map((stage, index) => <TabsContent key={stage} value={stage} forceMount className={`mt-0 block min-h-full w-full min-w-full shrink-0 snap-start snap-always data-[state=inactive]:block ${index < stages.length - 1 ? 'pr-5' : ''}`}><BoardLane mobile stage={stage} groups={groupsForStage(groups, stage)} dropStage={drop.dropStage} onDragStart={onDragStart} onDragEnd={onDragEnd} onTransition={onTransition} /></TabsContent>)}
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
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><h1 className="text-[29px] font-bold leading-tight tracking-tight lg:text-2xl">{t('title')}</h1><Button asChild size="sm" variant="outline"><Link to="/admin/procurements/archive"><Archive />{t('board.archive')}</Link></Button></div><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground lg:left-3" /><Input aria-label={t('mobile.searchPlaceholder')} className="h-12 rounded-2xl bg-white pl-11 lg:h-9 lg:rounded-md lg:pl-9" value={search} placeholder={t('mobile.searchPlaceholder')} onChange={(event) => setSearch(event.target.value)} /></div></div>{moveError ? <Alert variant="destructive"><AlertDescription>{moveError}</AlertDescription></Alert> : moveSuccess ? <p role="status" className="text-sm text-emerald-700">{t('board.statusUpdated')}</p> : null}{query.isLoading ? <BoardSkeleton /> : query.isError ? <div className="rounded-xl border p-6 text-center"><p className="font-medium">{t('mobile.loadError')}</p><Button variant="outline" className="mt-3" onClick={() => void query.refetch()}>{t('retry', { ns: 'common' })}</Button></div> : isMobile ? <MobileBoard groups={groups} {...dragProps} /> : <DesktopBoard groups={groups} {...dragProps} />}</div>
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
  const savedRef = useRef(initial)
  const formRef = useRef(initial)

  useEffect(() => {
    const next = createForm(row)
    savedRef.current = next
    formRef.current = next
    setForm(next)
    setSaveState('idle')
  }, [row])

  useEffect(() => { formRef.current = form }, [form])

  useEffect(() => {
    if (JSON.stringify(form) === JSON.stringify(savedRef.current)) return
    const timer = window.setTimeout(async () => {
      const snapshot = form
      setSaveState('saving')
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
      } catch (error) {
        setSaveState('error')
        onError(error instanceof ApiError ? error.message : t('updateError'))
      }
    }, autoSaveDelayMs)
    return () => window.clearTimeout(timer)
  }, [form, onError, queryClient, row.id, t])

  useEffect(() => () => {
    const snapshot = formRef.current
    if (JSON.stringify(snapshot) !== JSON.stringify(savedRef.current)) void procurementsApi.updateProcurement(row.id, snapshot)
  }, [row.id])

  return { form, setForm, saveState, isDirty: JSON.stringify(form) !== JSON.stringify(savedRef.current) }
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

function AttachmentPreview({ attachment, onDelete }: { attachment: ProcurementAttachment; onDelete: () => void }) {
  const src = useAttachmentUrl(attachment)
  return <div className="relative size-16 shrink-0">{src && attachment.contentType.startsWith('image/') ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt="" className="size-16 rounded-lg border object-cover" /></a> : <div className="flex size-16 items-center justify-center rounded-lg border bg-muted"><FileText className="size-5 text-muted-foreground" /></div>}<Button type="button" variant="destructive" size="icon-xs" className="absolute -right-2 -top-2 size-6 rounded-full" onClick={onDelete}><X /></Button></div>
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
  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
  }
  return (
    <div className="mb-5 space-y-2">
      <Label className="text-sm text-muted-foreground">{t('productImage.label')}</Label>
      <div className="flex flex-wrap items-center gap-3">
        {previewUrl
          ? <img src={previewUrl} alt={t('productImage.previewAlt')} className="size-24 rounded-xl border bg-muted object-cover" />
          : <ProductImage row={row} className="size-24" />}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <label className="cursor-pointer">
              <ImagePlus />
              {row.hasManualImage || file ? t('productImage.replace') : t('productImage.add')}
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
                }}
              />
            </label>
          </Button>
          {file ? <Button size="sm" onClick={() => upload.mutate(file)} disabled={upload.isPending}>{upload.isPending ? t('uploading') : t('productImage.upload')}</Button> : null}
          {file ? <Button variant="ghost" size="sm" onClick={clearSelection}>{t('cancel')}</Button> : null}
          {!file && row.hasManualImage ? <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>{t('productImage.delete')}</Button> : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t('productImage.hint')}</p>
    </div>
  )
}

function ItemPurchaseEditor({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { form, setForm, saveState, isDirty } = useRowForm(row, setError)
  const removeProcurement = useMutation({
    mutationFn: () => procurementsApi.deleteProcurement(row.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
      void queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      navigate('/admin/procurements', { replace: true })
    },
    onError: () => setError(t('removeError')),
  })
  const receipt = row.attachments.find((attachment) => attachment.kind === 'Receipt')
  const upload = useMutation({ mutationFn: (file: File) => procurementsApi.uploadReceipt(row.id, file), onSuccess: (attachment) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: [...value.attachments.filter((item) => item.kind !== 'Receipt'), attachment] } : value)), onError: () => setError(t('uploadError')) })
  const remove = useMutation({ mutationFn: (attachmentId: string) => procurementsApi.deleteAttachment(row.id, attachmentId), onSuccess: (_, attachmentId) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: value.attachments.filter((item) => item.id !== attachmentId) } : value)), onError: () => setError(t('uploadError')) })
  return <div className="rounded-xl border bg-card p-4 sm:p-5"><div className="mb-5 min-w-0"><h2 className="text-lg font-semibold">{productTitle(row)}</h2>{row.itemDescription && row.itemName !== productTitle(row) ? <p className="text-sm text-muted-foreground">{row.itemDescription}</p> : null}{row.productUrl ? <a href={row.productUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm text-primary"><span className="truncate">{compactProductUrl(row.productUrl)}</span><ExternalLink className="size-3.5" /></a> : null}<p className="mt-2 text-sm text-[#667085]">{t(`statuses.lifecycle.${row.status}`)}</p></div>{error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}<ProductImageEditor row={row} onError={setError} /><div className="grid gap-4 sm:grid-cols-2"><Field label={t('fields.purchaseUrl')} id="purchase-url"><Input id="purchase-url" className="h-9 bg-white" value={form.purchaseUrl ?? ''} onChange={(event) => setForm((value) => ({ ...value, purchaseUrl: emptyToNull(event.target.value) }))} /></Field><Field label={t('fields.purchasePrice')} id="purchase-price"><MoneyField id="purchase-price" value={form.purchasePrice} currency={form.purchaseCurrencyCode} onValue={(purchasePrice) => setForm((value) => ({ ...value, purchasePrice }))} onCurrency={(purchaseCurrencyCode) => setForm((value) => ({ ...value, purchaseCurrencyCode }))} /></Field><div className="space-y-2"><Label className="text-sm text-muted-foreground">{t('fields.receipt')}</Label><div className="flex items-center gap-3">{receipt ? <AttachmentPreview attachment={receipt} onDelete={() => remove.mutate(receipt.id)} /> : null}<Button asChild variant="outline" size="sm"><label className="cursor-pointer"><ImagePlus />{receipt ? t('replaceReceipt') : t('addReceipt')}<input type="file" className="sr-only" accept="image/*,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) upload.mutate(file) }} /></label></Button></div></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><SaveStateLabel state={saveState} /><Button type="button" variant="destructive" disabled={removeProcurement.isPending || isDirty || saveState === 'saving'} onClick={() => { if (window.confirm(t('removeConfirm'))) removeProcurement.mutate() }}><Trash2 />{removeProcurement.isPending ? t('removing') : t('removeFromProcurement')}</Button></div></div>
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

function ProcurementErrorHistory({ procurementId }: { procurementId: string }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['procurement-errors', procurementId], queryFn: ({ signal }) => procurementsApi.getProcurementErrors(procurementId, signal) })
  const resolve = useMutation({
    mutationFn: procurementsApi.resolveProcurementError,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['procurement-errors', procurementId] })
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
    },
  })
  return <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-semibold">{t('board.issueHistory')}</h2>{query.isLoading ? <Skeleton className="h-16 w-full" /> : query.isError ? <Alert variant="destructive"><AlertDescription>{t('board.errorsLoadFailed')}</AlertDescription></Alert> : query.data?.length ? <div className="space-y-3">{query.data.map((issue) => <div key={issue.id} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="whitespace-pre-wrap text-sm">{issue.text}</p><p className="mt-1 text-xs text-muted-foreground">{t(`statuses.lifecycle.${issue.statusAtCreation}`)} · {new Date(issue.createdAt).toLocaleString()}</p>{issue.isResolved ? <Badge variant="outline" className="mt-2">{t('board.resolved')}</Badge> : issue.isBlocking ? <Badge variant="destructive" className="mt-2">{t('board.blockingIssue')}</Badge> : null}</div>{!issue.isResolved ? <Button size="sm" variant="outline" disabled={resolve.isPending} onClick={() => resolve.mutate(issue.id)}>{t('board.resolveIssue')}</Button> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">{t('board.noIssues')}</p>}</section>
}

export function ProcurementItemDetailPage() {
  const { t } = useTranslation('procurements')
  const { procurementId } = useParams()
  const query = useAllProcurements()
  const row = query.data?.find((value) => value.id === procurementId)
  const group = query.data ? groupOrders(query.data).find((value) => value.orderId === row?.orderId) : undefined
  if (query.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />
  if (!row || !group) return <Alert variant="destructive"><AlertDescription>{t('board.notFound')}</AlertDescription></Alert>
  return <DetailShell title={t('board.itemCard')} group={group}><p className="text-sm text-muted-foreground">{t('board.position', { current: group.rows.findIndex((value) => value.id === row.id) + 1, total: group.rows.length })}</p><ItemPurchaseEditor row={row} /><UndoPurchaseAction row={row} /><ProcurementErrorHistory procurementId={row.id} /></DetailShell>
}

function UndoPurchaseAction({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const undo = useMutation({
    mutationFn: () => procurementsApi.transitionProcurement(row.id, { status: 'RequiredPurchase' }),
    onSuccess: (updated) => {
      queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === updated.id ? updated : value))
      void queryClient.invalidateQueries({ queryKey: ['procurements'] })
      void queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    },
  })
  if (row.status !== 'Purchased') return null
  return <div className="flex flex-wrap items-center justify-end gap-2">{undo.isError ? <p role="alert" className="text-sm text-destructive">{undo.error instanceof ApiError ? undo.error.message : t('board.moveError')}</p> : null}<Button variant="outline" disabled={undo.isPending} onClick={() => undo.mutate()}><RotateCcw />{t('actions.undoPurchase')}</Button></div>
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

