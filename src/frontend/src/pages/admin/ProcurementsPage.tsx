import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  ImagePlus,
  Package,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
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
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

const purchaseStatuses: PurchaseStatus[] = ['Pending', 'Purchased', 'Error']
const arrivalStatuses: ArrivalStatus[] = ['Pending', 'InTransit', 'Received']
const shipmentStatuses: ShipmentStatus[] = ['AwaitingShipment', 'Shipped', 'Delivered']
const currencies: ProcurementCurrencyCode[] = ['JPY', 'RUB', 'USD', 'EUR']
const currencySymbols: Record<ProcurementCurrencyCode, string> = { JPY: '¥', RUB: '₽', USD: '$', EUR: '€' }
const stages = ['purchase', 'moscow', 'client', 'completed'] as const
const autoSaveDelayMs = 650

type BoardStage = typeof stages[number]
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type OrderGroup = { orderId: string; trackingCode: string; rows: ProcurementRow[]; stage: BoardStage }

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

function deriveStage(rows: ProcurementRow[]): BoardStage {
  if (!rows.every((row) => row.purchaseStatus === 'Purchased')) return 'purchase'
  if (!rows.every((row) => row.arrivalStatus === 'Received')) return 'moscow'
  if (!rows.every((row) => row.shipmentStatus === 'Delivered')) return 'client'
  return 'completed'
}

function groupOrders(rows: ProcurementRow[]) {
  const grouped = new Map<string, ProcurementRow[]>()
  rows.forEach((row) => grouped.set(row.orderId, [...(grouped.get(row.orderId) ?? []), row]))
  return Array.from(grouped, ([orderId, orderRows]) => {
    const sortedRows = orderRows.toSorted((left, right) => left.sortOrder - right.sortOrder || left.itemName.localeCompare(right.itemName))
    return { orderId, trackingCode: sortedRows[0]?.trackingCode ?? '', rows: sortedRows, stage: deriveStage(sortedRows) } satisfies OrderGroup
  })
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

function badgeClasses(orderId: string) {
  const palette = [
    'border-blue-200 bg-blue-50 text-blue-700',
    'border-orange-200 bg-orange-50 text-orange-700',
    'border-emerald-200 bg-emerald-50 text-emerald-700',
    'border-violet-200 bg-violet-50 text-violet-700',
    'border-pink-200 bg-pink-50 text-pink-700',
    'border-cyan-200 bg-cyan-50 text-cyan-700',
    'border-amber-200 bg-amber-50 text-amber-700',
  ]
  let hash = 0
  for (const character of orderId) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return palette[Math.abs(hash) % palette.length]
}

function OrderBadge({ group }: { group: Pick<OrderGroup, 'orderId' | 'trackingCode'> }) {
  return <Badge variant="outline" className={badgeClasses(group.orderId)}>{group.trackingCode}</Badge>
}

function ProductImage({ row, className = 'size-14' }: { row: ProcurementRow; className?: string }) {
  return row.productImageUrl
    ? <img src={row.productImageUrl} alt="" className={`${className} shrink-0 rounded-lg bg-muted object-cover`} />
    : <span className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-muted`}><Package className="size-5 text-muted-foreground" /></span>
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

function purchaseStatusClasses(status: PurchaseStatus) {
  if (status === 'Purchased') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'Error') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function PurchaseItemCard({ group, row, position }: { group: OrderGroup; row: ProcurementRow; position: number }) {
  const { t } = useTranslation('procurements')
  const priceCurrency = row.purchasePrice == null ? row.itemCurrencyCode as ProcurementCurrencyCode | null : row.purchaseCurrencyCode
  return (
    <Link to={`/admin/procurements/items/${row.id}`} className="block rounded-xl border bg-card p-3 shadow-sm transition-colors transition-shadow hover:border-border/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-center justify-between gap-2"><OrderBadge group={group} /><span className="text-xs text-muted-foreground">{t('board.position', { current: position, total: group.rows.length })}</span></div>
      <div className="mt-3 flex min-w-0 gap-3"><ProductImage row={row} /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold">{row.itemName}</p>{row.itemDescription ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.itemDescription}</p> : null}<p className="mt-1 truncate text-xs text-muted-foreground">{row.shopName || row.productSource}</p></div></div>
      <div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-semibold">{formatMoney(row.purchasePrice ?? row.unitPrice, priceCurrency) ?? '—'}</span><Badge variant="outline" className={purchaseStatusClasses(row.purchaseStatus)}>{t(`statuses.purchase.${row.purchaseStatus}`)}</Badge></div>
    </Link>
  )
}

function OrderItemPreview({ row, position, total }: { row: ProcurementRow; position: number; total: number }) {
  return <div className="flex min-w-0 items-center gap-2"><ProductImage row={row} className="size-10" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{row.itemName}</p>{row.itemDescription ? <p className="truncate text-[11px] text-muted-foreground">{row.itemDescription}</p> : null}</div><span className="shrink-0 text-[10px] text-muted-foreground">{position} / {total}</span></div>
}

function stageStatus(group: OrderGroup, stage: BoardStage, t: (key: string) => string) {
  if (stage === 'moscow') return group.rows.some((row) => row.arrivalStatus === 'InTransit') ? t('statuses.arrival.InTransit') : t('board.readyForMoscow')
  if (stage === 'client') return group.rows.some((row) => row.shipmentStatus === 'Shipped') ? t('statuses.shipment.Shipped') : t('board.readyForClient')
  return t('board.delivered')
}

function OrderCard({ group, stage }: { group: OrderGroup; stage: Exclude<BoardStage, 'purchase'> }) {
  const { t } = useTranslation('procurements')
  const preview = group.rows.slice(0, 3)
  const shipping = group.rows.find((row) => row.shippingMethod || row.shippingTrackingNumber || row.shippingCost != null)
  const total = orderTotal(group.rows)
  return (
    <Link to={`/admin/procurements/orders/${group.orderId}/${stage}`} className="block rounded-xl border bg-card p-3 shadow-sm transition-colors transition-shadow hover:border-border/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-center justify-between gap-2"><OrderBadge group={group} /><Badge variant="outline" className={stage === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}>{stageStatus(group, stage, t)}</Badge></div>
      <div className="mt-3"><p className="text-sm font-semibold">{t('board.orderNumber', { code: group.trackingCode })}</p><p className="text-xs text-muted-foreground">{t('board.itemCount', { count: group.rows.length })}</p></div>
      <div className="mt-3 space-y-2">{preview.map((row, index) => <OrderItemPreview key={row.id} row={row} position={index + 1} total={group.rows.length} />)}{group.rows.length > 3 ? <p className="pl-12 text-xs text-muted-foreground">{t('board.moreItems', { count: group.rows.length - 3 })}</p> : null}</div>
      {stage === 'moscow' && total ? <p className="mt-3 border-t pt-2 text-xs font-semibold">{t('board.total')}: {total}</p> : null}
      {stage !== 'moscow' && shipping ? <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">{shipping.shippingMethod ? <p>{shipping.shippingMethod}</p> : null}{shipping.shippingTrackingNumber ? <p className="truncate font-mono">{shipping.shippingTrackingNumber}</p> : null}{formatMoney(shipping.shippingCost, shipping.shippingCurrencyCode) ? <p>{formatMoney(shipping.shippingCost, shipping.shippingCurrencyCode)}</p> : null}</div> : null}
    </Link>
  )
}

function EmptyLane({ purchase }: { purchase: boolean }) {
  const { t } = useTranslation('procurements')
  return <p className="py-8 text-center text-sm text-muted-foreground">{t(purchase ? 'board.noItems' : 'board.noOrders')}</p>
}

function MoscowGroups({ groups }: { groups: OrderGroup[] }) {
  const { t } = useTranslation('procurements')
  const shipments = new Map<string, OrderGroup[]>()
  const ungrouped: OrderGroup[] = []
  groups.forEach((group) => {
    const tracking = group.rows.find((row) => row.warehouseTrackingNumber)?.warehouseTrackingNumber
    if (!tracking) ungrouped.push(group)
    else shipments.set(tracking, [...(shipments.get(tracking) ?? []), group])
  })
  const section = (key: string, title: string, orders: OrderGroup[]) => <div key={key} className="space-y-2"><div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs font-medium"><Truck className="size-3.5" /><span className="truncate">{title}</span><span className="ml-auto shrink-0 text-muted-foreground">{t('board.orderCount', { count: orders.length })}</span></div><div className="space-y-3">{orders.map((group) => <OrderCard key={group.orderId} group={group} stage="moscow" />)}</div></div>
  return <div className="space-y-4">{ungrouped.length ? section('ungrouped', t('board.ungrouped'), ungrouped) : null}{Array.from(shipments, ([tracking, orders]) => section(tracking, `MSK SHIP · ${tracking}`, orders))}</div>
}

function BoardLane({ stage, groups }: { stage: BoardStage; groups: OrderGroup[] }) {
  const { t } = useTranslation('procurements')
  const purchaseRows = stage === 'purchase' ? groups.flatMap((group) => group.rows.map((row, index) => ({ group, row, position: index + 1 }))) : []
  const count = stage === 'purchase' ? purchaseRows.length : groups.length
  return (
    <section className="min-w-0">
      <div className="mb-3 flex h-8 items-center justify-between gap-2"><h2 className="text-sm font-semibold">{t(`board.stages.${stage}`)}</h2><Badge variant="secondary">{count}</Badge></div>
      {stage === 'moscow' ? <MoscowGroups groups={groups} /> : <div className="space-y-3">{stage === 'purchase' ? purchaseRows.map((item) => <PurchaseItemCard key={item.row.id} {...item} />) : groups.map((group) => <OrderCard key={group.orderId} group={group} stage={stage} />)}</div>}
      {!count ? <EmptyLane purchase={stage === 'purchase'} /> : null}
    </section>
  )
}

function BoardSkeleton() {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">{stages.map((stage) => <div key={stage}><Skeleton className="mb-3 h-8 w-36" /><div className="space-y-3"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-52 rounded-xl" /></div></div>)}</div>
}

function DesktopBoard({ groups }: { groups: OrderGroup[] }) {
  return <div className="grid grid-cols-4 items-start gap-4 2xl:gap-5">{stages.map((stage) => <BoardLane key={stage} stage={stage} groups={groups.filter((group) => group.stage === stage)} />)}</div>
}

function MobileBoard({ groups }: { groups: OrderGroup[] }) {
  const { t } = useTranslation('procurements')
  const [active, setActive] = useState<BoardStage>('purchase')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const activate = (stage: BoardStage) => { setActive(stage); const index = stages.indexOf(stage); scrollerRef.current?.scrollTo({ left: index * scrollerRef.current.clientWidth, behavior: 'smooth' }) }
  const syncFromScroll = () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); animationRef.current = requestAnimationFrame(() => { const scroller = scrollerRef.current; if (!scroller?.clientWidth) return; setActive(stages[Math.max(0, Math.min(stages.length - 1, Math.round(scroller.scrollLeft / scroller.clientWidth)))]) }) }
  return (
    <Tabs value={active} onValueChange={(value) => activate(value as BoardStage)} className="min-w-0 gap-4">
      <TabsList className="grid h-10 w-full grid-cols-4">{stages.map((stage) => <TabsTrigger key={stage} value={stage} className="min-w-0 px-1 text-xs"><span className="truncate">{t(`board.mobileStages.${stage}`)}</span></TabsTrigger>)}</TabsList>
      <div ref={scrollerRef} className="-mx-1 flex snap-x snap-mandatory overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onScroll={syncFromScroll}>
        {stages.map((stage) => <TabsContent key={stage} value={stage} forceMount className="mt-0 block w-full min-w-full shrink-0 snap-start data-[state=inactive]:block"><BoardLane stage={stage} groups={groups.filter((group) => group.stage === stage)} /></TabsContent>)}
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

export function ProcurementsPage() {
  const { t } = useTranslation('procurements')
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [search, setSearch] = useState('')
  const query = useProcurements()
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const groups = useMemo(() => groupOrders(query.data ?? []).filter((group) => matchesSearch(group, normalizedSearch)), [normalizedSearch, query.data])
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-bold">{t('title')}</h1><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-9 bg-white pl-9" value={search} placeholder={t('mobile.searchPlaceholder')} onChange={(event) => setSearch(event.target.value)} /></div></div>{query.isLoading ? <BoardSkeleton /> : query.isError ? <div className="rounded-xl border p-6 text-center"><p className="font-medium">{t('mobile.loadError')}</p><Button variant="outline" className="mt-3" onClick={() => void query.refetch()}>{t('retry', { ns: 'common' })}</Button></div> : isMobile ? <MobileBoard groups={groups} /> : <DesktopBoard groups={groups} />}</div>
}

function emptyToNull(value: string) { return value === '' ? null : value }
function numberOrNull(value: string) { if (!value) return null; const parsed = Number(value.replace(',', '.')); return Number.isFinite(parsed) ? parsed : null }

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={id} className="text-sm text-muted-foreground">{label}</Label>{children}</div>
}

function MoneyField({ id, value, currency, onValue, onCurrency }: { id: string; value: number | null; currency: ProcurementCurrencyCode; onValue: (value: number | null) => void; onCurrency: (value: ProcurementCurrencyCode) => void }) {
  return <div className="flex min-w-0"><Input id={id} className="h-9 min-w-0 rounded-r-none bg-white" inputMode="decimal" value={value ?? ''} onChange={(event) => onValue(numberOrNull(event.target.value))} /><Select value={currency} onValueChange={(value) => onCurrency(value as ProcurementCurrencyCode)}><SelectTrigger aria-label="Валюта" className="w-[92px] shrink-0 rounded-l-none border-l-0 bg-white data-[size=default]:h-9"><SelectValue /></SelectTrigger><SelectContent>{currencies.map((code) => <SelectItem key={code} value={code}>{currencySymbols[code]} {code}</SelectItem>)}</SelectContent></Select></div>
}

function StatusSelect<T extends string>({ id, value, values, group, onChange }: { id: string; value: T; values: T[]; group: 'purchase' | 'arrival' | 'shipment'; onChange: (value: T) => void }) {
  const { t } = useTranslation('procurements')
  return <Select value={value} onValueChange={(next) => onChange(next as T)}><SelectTrigger id={id} className="w-full bg-white data-[size=default]:h-9"><SelectValue /></SelectTrigger><SelectContent>{values.map((status) => <SelectItem key={status} value={status}>{t(`statuses.${group}.${status}`)}</SelectItem>)}</SelectContent></Select>
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

  return { form, setForm, saveState }
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

function ItemPurchaseEditor({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const { form, setForm, saveState } = useRowForm(row, setError)
  const receipt = row.attachments.find((attachment) => attachment.kind === 'Receipt')
  const upload = useMutation({ mutationFn: (file: File) => procurementsApi.uploadReceipt(row.id, file), onSuccess: (attachment) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: [...value.attachments.filter((item) => item.kind !== 'Receipt'), attachment] } : value)), onError: () => setError(t('uploadError')) })
  const remove = useMutation({ mutationFn: (attachmentId: string) => procurementsApi.deleteAttachment(row.id, attachmentId), onSuccess: (_, attachmentId) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: value.attachments.filter((item) => item.id !== attachmentId) } : value)), onError: () => setError(t('uploadError')) })
  return <div className="rounded-xl border bg-card p-4 sm:p-5"><div className="mb-5 flex gap-3"><ProductImage row={row} className="size-20" /><div className="min-w-0"><h2 className="text-lg font-semibold">{row.itemName}</h2>{row.itemDescription ? <p className="text-sm text-muted-foreground">{row.itemDescription}</p> : null}{row.productUrl ? <a href={row.productUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-sm text-primary"><span className="truncate">{row.productUrl}</span><ExternalLink className="size-3.5" /></a> : null}</div></div>{error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}<div className="grid gap-4 sm:grid-cols-2"><Field label={t('fields.purchaseStatus')} id="purchase-status"><StatusSelect id="purchase-status" value={form.purchaseStatus} values={purchaseStatuses} group="purchase" onChange={(purchaseStatus) => setForm((value) => ({ ...value, purchaseStatus }))} /></Field><Field label={t('fields.purchaseUrl')} id="purchase-url"><Input id="purchase-url" className="h-9 bg-white" value={form.purchaseUrl ?? ''} onChange={(event) => setForm((value) => ({ ...value, purchaseUrl: emptyToNull(event.target.value) }))} /></Field><Field label={t('fields.purchasePrice')} id="purchase-price"><MoneyField id="purchase-price" value={form.purchasePrice} currency={form.purchaseCurrencyCode} onValue={(purchasePrice) => setForm((value) => ({ ...value, purchasePrice }))} onCurrency={(purchaseCurrencyCode) => setForm((value) => ({ ...value, purchaseCurrencyCode }))} /></Field><div className="space-y-2"><Label className="text-sm text-muted-foreground">{t('fields.receipt')}</Label><div className="flex items-center gap-3">{receipt ? <AttachmentPreview attachment={receipt} onDelete={() => remove.mutate(receipt.id)} /> : null}<Button asChild variant="outline" size="sm"><label className="cursor-pointer"><ImagePlus />{receipt ? t('replaceReceipt') : t('addReceipt')}<input type="file" className="sr-only" accept="image/*,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) upload.mutate(file) }} /></label></Button></div></div></div><div className="mt-5"><SaveStateLabel state={saveState} /></div></div>
}

function WarehouseEditor({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const { form, setForm, saveState } = useRowForm(row, setError)
  const photos = row.attachments.filter((attachment) => attachment.kind === 'WarehousePhoto')
  const upload = useMutation({ mutationFn: (files: File[]) => procurementsApi.uploadWarehousePhotos(row.id, files), onSuccess: (attachments) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: [...value.attachments, ...attachments] } : value)), onError: () => setError(t('uploadError')) })
  const remove = useMutation({ mutationFn: (attachmentId: string) => procurementsApi.deleteAttachment(row.id, attachmentId), onSuccess: (_, attachmentId) => queryClient.setQueryData<ProcurementRow[]>(['procurements'], (rows) => rows?.map((value) => value.id === row.id ? { ...value, attachments: value.attachments.filter((item) => item.id !== attachmentId) } : value)), onError: () => setError(t('uploadError')) })
  return <StageEditorCard row={row} error={error} state={saveState}><Field label={t('fields.warehouseTrackingNumber')} id={`${row.id}-track`}><CopyField id={`${row.id}-track`} value={form.warehouseTrackingNumber ?? ''} onChange={(warehouseTrackingNumber) => setForm((value) => ({ ...value, warehouseTrackingNumber: emptyToNull(warehouseTrackingNumber) }))} /></Field><Field label={t('fields.arrivalStatus')} id={`${row.id}-status`}><StatusSelect id={`${row.id}-status`} value={form.arrivalStatus} values={arrivalStatuses} group="arrival" onChange={(arrivalStatus) => setForm((value) => ({ ...value, arrivalStatus }))} /></Field><Field label={t('fields.warehouseReceivedAt')} id={`${row.id}-date`}><Input id={`${row.id}-date`} className="h-9 bg-white" type="date" value={form.warehouseReceivedAt ?? ''} onChange={(event) => setForm((value) => ({ ...value, warehouseReceivedAt: emptyToNull(event.target.value) }))} /></Field><div className="space-y-2 sm:col-span-2"><Label className="text-sm text-muted-foreground">{t('fields.warehousePhotos')}</Label><div className="flex flex-wrap items-center gap-3">{photos.map((photo) => <AttachmentPreview key={photo.id} attachment={photo} onDelete={() => remove.mutate(photo.id)} />)}<Button asChild variant="outline" size="sm"><label className="cursor-pointer"><ImagePlus />{t('addPhotos')}<input type="file" className="sr-only" multiple accept="image/*" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; if (files.length) upload.mutate(files) }} /></label></Button></div></div></StageEditorCard>
}

function ShippingEditor({ row }: { row: ProcurementRow }) {
  const { t } = useTranslation('procurements')
  const [error, setError] = useState('')
  const { form, setForm, saveState } = useRowForm(row, setError)
  return <StageEditorCard row={row} error={error} state={saveState}><Field label={t('fields.shippingTrackingNumber')} id={`${row.id}-track`}><CopyField id={`${row.id}-track`} value={form.shippingTrackingNumber ?? ''} onChange={(shippingTrackingNumber) => setForm((value) => ({ ...value, shippingTrackingNumber: emptyToNull(shippingTrackingNumber) }))} /></Field><Field label={t('fields.shipmentStatus')} id={`${row.id}-status`}><StatusSelect id={`${row.id}-status`} value={form.shipmentStatus} values={shipmentStatuses} group="shipment" onChange={(shipmentStatus) => setForm((value) => ({ ...value, shipmentStatus }))} /></Field><Field label={t('fields.shippingMethod')} id={`${row.id}-method`}><Input id={`${row.id}-method`} className="h-9 bg-white" value={form.shippingMethod ?? ''} onChange={(event) => setForm((value) => ({ ...value, shippingMethod: emptyToNull(event.target.value) }))} /></Field><Field label={t('fields.shippingWeight')} id={`${row.id}-weight`}><Input id={`${row.id}-weight`} className="h-9 bg-white" inputMode="decimal" value={form.shippingWeight ?? ''} onChange={(event) => setForm((value) => ({ ...value, shippingWeight: numberOrNull(event.target.value) }))} /></Field><Field label={t('fields.shippingCost')} id={`${row.id}-cost`}><MoneyField id={`${row.id}-cost`} value={form.shippingCost} currency={form.shippingCurrencyCode} onValue={(shippingCost) => setForm((value) => ({ ...value, shippingCost }))} onCurrency={(shippingCurrencyCode) => setForm((value) => ({ ...value, shippingCurrencyCode }))} /></Field><Field label={t('fields.shippedAt')} id={`${row.id}-date`}><Input id={`${row.id}-date`} className="h-9 bg-white" type="date" value={form.shippedAt ?? ''} onChange={(event) => setForm((value) => ({ ...value, shippedAt: emptyToNull(event.target.value) }))} /></Field></StageEditorCard>
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
  const query = useProcurements()
  const row = query.data?.find((value) => value.id === procurementId)
  const group = query.data ? groupOrders(query.data).find((value) => value.orderId === row?.orderId) : undefined
  if (query.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />
  if (!row || !group) return <Alert variant="destructive"><AlertDescription>{t('board.notFound')}</AlertDescription></Alert>
  return <DetailShell title={t('board.itemCard')} group={group}><p className="text-sm text-muted-foreground">{t('board.position', { current: group.rows.findIndex((value) => value.id === row.id) + 1, total: group.rows.length })}</p><ItemPurchaseEditor row={row} /></DetailShell>
}

export function ProcurementOrderDetailPage() {
  const { t } = useTranslation('procurements')
  const { orderId, stage } = useParams()
  const query = useProcurements()
  const group = query.data ? groupOrders(query.data).find((value) => value.orderId === orderId) : undefined
  if (query.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />
  if (!group) return <Alert variant="destructive"><AlertDescription>{t('board.notFound')}</AlertDescription></Alert>
  const currentStage = stages.includes(stage as BoardStage) ? stage as BoardStage : group.stage
  return <DetailShell title={t('board.orderCard')} group={group}>{currentStage === 'moscow' ? <div className="space-y-4">{group.rows.map((row) => <WarehouseEditor key={row.id} row={row} />)}</div> : currentStage === 'client' ? <div className="space-y-4">{group.rows.map((row) => <ShippingEditor key={row.id} row={row} />)}</div> : <CompletedSummary group={group} />}</DetailShell>
}
