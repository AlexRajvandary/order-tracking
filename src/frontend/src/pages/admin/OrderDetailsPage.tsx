import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as ordersApi from '@/features/orders/api/ordersApi'
import * as customersApi from '@/features/customers/api/customersApi'
import * as statusesApi from '@/features/statuses/api/statusesApi'
import type {
  CurrencyCode,
  OrderItem,
  OrderStatus,
  UpsertOrderItemRequest,
} from '@/features/orders/types'
import type { UpsertCustomerRequest } from '@/features/customers/types'
import type { UpdateOrderItemStatusRequest } from '@/features/statuses/types'
import { CountrySelect } from '@/features/statuses/ui/CountrySelect'
import { orderStatusStyles } from '@/features/orders/ui/OrderStatusBadge'
import { ItemStatusTimeline } from '@/features/orders/ui/order-timeline'
import { ApiError } from '@/shared/api/client'
import { capitalizeNamePart } from '@/shared/lib/capitalizeNamePart'
import { currencies, formatMoney, isFiniteMoney } from '@/shared/lib/currency'
import { formatTelegram, telegramHref } from '@/shared/lib/telegram'
import { compressImagesToWebp } from '@/shared/lib/compressImageToWebp'
import { cn } from '@/shared/lib/utils'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/shared/ui/carousel'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { DatePicker, DateTimePicker, STATUS_HISTORY_DAY_PRESETS, formatYmd, parseYmdLocal } from '@/shared/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const NO_STATUS = '__none__'

const ORDER_STATUSES: OrderStatus[] = [
  'AwaitingPayment',
  'InProgress',
  'Completed',
  'Cancelled',
]

type CustomerEditFormState = {
  lastName: string
  firstName: string
  patronymic: string
  telegram: string
  phone: string
  whatsApp: string
  vk: string
  email: string
  notes: string
}

function OrderCustomerEditDialog({
  open,
  initial,
  loading,
  error,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  initial: CustomerEditFormState
  loading: boolean
  error: string | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpsertCustomerRequest) => void
}) {
  const { t } = useTranslation('orders')
  const { t: tc } = useTranslation('customers')
  const [form, setForm] = useState<CustomerEditFormState>(initial)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setForm(initial)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('details.editCustomerTitle')}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit({
                lastName: form.lastName || null,
                firstName: form.firstName || null,
                patronymic: form.patronymic || null,
                telegram: form.telegram || null,
                phone: form.phone || null,
                whatsApp: form.whatsApp || null,
                vk: form.vk || null,
                email: form.email || null,
                notes: form.notes || null,
              })
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="order-customer-lastName">{tc('form.lastName')}</Label>
                <Input
                  id="order-customer-lastName"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: capitalizeNamePart(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-customer-firstName">{tc('form.firstName')}</Label>
                <Input
                  id="order-customer-firstName"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: capitalizeNamePart(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-customer-patronymic">{tc('form.patronymic')}</Label>
                <Input
                  id="order-customer-patronymic"
                  value={form.patronymic}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, patronymic: capitalizeNamePart(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-customer-telegram">{tc('form.telegram')}</Label>
              <Input
                id="order-customer-telegram"
                value={form.telegram}
                  placeholder={tc('form.telegramPlaceholder')}
                onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-customer-phone">{tc('form.phone')}</Label>
              <Input
                id="order-customer-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-customer-email">{tc('form.email')}</Label>
              <Input
                id="order-customer-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="order-customer-whatsapp">WhatsApp</Label>
                <Input
                  id="order-customer-whatsapp"
                  value={form.whatsApp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsApp: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-customer-vk">VK</Label>
                <Input
                  id="order-customer-vk"
                  value={form.vk}
                  onChange={(e) => setForm((f) => ({ ...f, vk: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-customer-notes">{tc('form.notes')}</Label>
              <Textarea
                id="order-customer-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('details.editCustomerHint')}</p>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel', { ns: 'common' })}
              </Button>
              <Button type="submit" disabled={submitting || loading}>
                {t('save', { ns: 'common' })}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CustomerField({
  label,
  value,
  emptyLabel,
  href,
}: {
  label: string
  value: string | null | undefined
  emptyLabel: string
  href?: string | null
}) {
  const trimmed = value?.trim() || null
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="min-w-0 flex-1 text-right">
        {trimmed ? (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {trimmed}
            </a>
          ) : (
            <span className="font-medium text-foreground">{trimmed}</span>
          )
        ) : (
          <span className="text-muted-foreground">{emptyLabel}</span>
        )}
      </span>
    </div>
  )
}

type ItemFormState = {
  itemType: 'Product' | 'Service'
  name: string
  description: string
  quantity: string
  unitPrice: string
  currencyCode: CurrencyCode
}

function ItemFormDialog({
  open,
  title,
  initial,
  showItemType = true,
  error,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  title: string
  initial: ItemFormState
  showItemType?: boolean
  error: string | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpsertOrderItemRequest) => void
}) {
  const { t, i18n } = useTranslation('orders')
  const [form, setForm] = useState<ItemFormState>(initial)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setForm(initial)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.name.trim()) return
            const quantity = Number(form.quantity)
            onSubmit({
              itemType: form.itemType,
              name: form.name.trim(),
              description: form.description.trim() || null,
              quantity: Number.isFinite(quantity) && quantity >= 1 ? quantity : 1,
              unitPrice:
                form.unitPrice.trim() === '' ? null : Number(form.unitPrice),
              currencyCode: form.unitPrice.trim() === '' ? null : form.currencyCode,
            })
          }}
        >
          {showItemType ? (
            <div className="space-y-1.5">
              <Label>{t('details.itemType')}</Label>
              <Select
                value={form.itemType}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, itemType: value as 'Product' | 'Service' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Product">{t('form.product')}</SelectItem>
                  <SelectItem value="Service">{t('form.service')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>{t('form.itemName')}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('form.itemDescription')}</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('form.unitPrice')}</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
              <Input
                type="number"
                min={0}
                step={form.currencyCode === 'JPY' ? 1 : 0.01}
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
              <Select
                value={form.currencyCode}
                onValueChange={(value) =>
                  setForm((form) => ({ ...form, currencyCode: value as CurrencyCode }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.itemType === 'Product' ? (
            <div className="space-y-1.5">
              <Label>{t('form.quantity')}</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
          ) : null}

          {(() => {
            const unit = Number(form.unitPrice)
            const quantity = Number(form.quantity)
            if (!isFiniteMoney(unit) || form.unitPrice.trim() === '') return null
            return (
              <p className="text-sm text-muted-foreground">
                {formatMoney(
                  unit *
                    (form.itemType === 'Product' && Number.isFinite(quantity) && quantity >= 1
                      ? quantity
                      : 1),
                  form.currencyCode,
                  i18n.language === 'ru' ? 'ru-RU' : 'en-US',
                )}
              </p>
            )
          })()}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t('details.saveItem')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatusUpdateDialog({
  open,
  item,
  orderCreatedAt,
  error,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  item: OrderItem
  orderCreatedAt: string
  error: string | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpdateOrderItemStatusRequest) => void
}) {
  const { t } = useTranslation('statuses')
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [statusId, setStatusId] = useState(NO_STATUS)
  const [customText, setCustomText] = useState('')
  const [comment, setComment] = useState('')
  const [country, setCountry] = useState('')
  const [location, setLocation] = useState('')
  const [publishAt, setPublishAt] = useState('')
  const [photos, setPhotos] = useState<{ id: string; file: File; previewUrl: string }[]>([])
  const [photosCarouselApi, setPhotosCarouselApi] = useState<CarouselApi>()

  const { data: statuses } = useQuery({
    queryKey: ['statuses', item.itemType],
    queryFn: () => statusesApi.getStatuses({ itemType: item.itemType }),
  })

  useEffect(() => {
    if (!photosCarouselApi || photos.length === 0) return
    photosCarouselApi.scrollTo(photos.length - 1)
  }, [photosCarouselApi, photos.length])

  useEffect(() => {
    if (mode !== 'preset' || statusId === NO_STATUS) return
    const selected = statuses?.find((s) => s.id === statusId)
    if (!selected) return
    if (selected.defaultCountry) setCountry(selected.defaultCountry)
    if (selected.defaultLocation) setLocation(selected.defaultLocation)
  }, [mode, statusId, statuses])

  function clearPhotos(list: { previewUrl: string }[]) {
    list.forEach((item) => URL.revokeObjectURL(item.previewUrl))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPhotos((prev) => {
            clearPhotos(prev)
            return []
          })
        } else {
          setMode('preset')
          setStatusId(NO_STATUS)
          setCustomText('')
          setComment('')
          setCountry('')
          setLocation('')
          setPublishAt('')
          setPhotos((prev) => {
            clearPhotos(prev)
            return []
          })
        }
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('update.title')}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as 'preset' | 'custom')}
          className="w-full gap-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preset">{t('update.preset')}</TabsTrigger>
            <TabsTrigger value="custom">{t('update.custom')}</TabsTrigger>
          </TabsList>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const photoFiles = photos.map((p) => p.file)
              const publishAtIso = publishAt.trim() || null
              if (mode === 'preset') {
                if (statusId === NO_STATUS) return
                onSubmit({
                  statusDefinitionId: statusId,
                  customStatusText: null,
                  comment,
                  country: country.trim() || null,
                  location: location.trim() || null,
                  publishAt: publishAtIso,
                  photos: photoFiles,
                })
              } else {
                if (!customText.trim()) return
                onSubmit({
                  statusDefinitionId: null,
                  customStatusText: customText.trim(),
                  comment,
                  country: country.trim() || null,
                  location: location.trim() || null,
                  publishAt: publishAtIso,
                  photos: photoFiles,
                })
              }
            }}
          >
            <TabsContent value="preset" className="mt-0">
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_STATUS}>—</SelectItem>
                  {statuses?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
            <TabsContent value="custom" className="mt-0">
              <Input
                placeholder={t('update.customPlaceholder')}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                required={mode === 'custom'}
              />
            </TabsContent>

          <div className="space-y-1.5">
            <Label>{t('update.comment')}</Label>
            <Textarea
              rows={3}
              placeholder={t('update.commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('update.country')}</Label>
            <CountrySelect value={country} onValueChange={setCountry} />
          </div>

          <div className="space-y-1.5">
            <Label>{t('update.location')}</Label>
            <Input
              placeholder={t('update.locationPlaceholder')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('update.publishAt')}</Label>
            <DateTimePicker
              value={publishAt || null}
              onChange={(iso) => setPublishAt(iso ?? '')}
              orderCreatedAt={orderCreatedAt}
              dayPresets={STATUS_HISTORY_DAY_PRESETS}
              align="start"
              className="h-9 w-full justify-start"
            />
            <p className="text-xs text-muted-foreground">{t('update.publishAtHint')}</p>
          </div>

          <div className="min-w-0 w-full space-y-1.5">
            <Label>{t('update.photos')}</Label>
            <label className="inline-flex cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files ?? []).slice(0, 5)
                  e.target.value = ''
                  if (!selected.length) return
                  void compressImagesToWebp(selected).then((compressed) => {
                    setPhotos((prev) =>
                      [
                        ...prev,
                        ...compressed.map((file) => ({
                          id: `${file.name}-${file.lastModified}-${Math.random()}`,
                          file,
                          previewUrl: URL.createObjectURL(file),
                        })),
                      ].slice(0, 5),
                    )
                  })
                }}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <span>
                  <ImagePlus />
                  {t('update.addPhotos')}
                </span>
              </Button>
            </label>
            {photos.length > 0 ? (
              <Carousel
                opts={{ align: 'start', containScroll: 'trimSnaps' }}
                setApi={setPhotosCarouselApi}
                className="w-full min-w-0"
              >
                <CarouselContent className="-ml-0">
                  {photos.map((photo) => (
                    <CarouselItem key={photo.id} className="basis-full pl-0">
                      <div className="relative w-full overflow-hidden rounded-xl border border-dashed bg-muted">
                        <img
                          src={photo.previewUrl}
                          alt=""
                          className="h-96 w-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          className="absolute top-2 right-2 size-7 shadow-sm"
                          aria-label={t('update.removePhoto')}
                          onClick={() =>
                            setPhotos((prev) => {
                              const target = prev.find((p) => p.id === photo.id)
                              if (target) URL.revokeObjectURL(target.previewUrl)
                              return prev.filter((p) => p.id !== photo.id)
                            })
                          }
                        >
                          <X />
                        </Button>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious
                  type="button"
                  className="left-1 size-7 border bg-background/90 shadow-sm disabled:hidden"
                />
                <CarouselNext
                  type="button"
                  className="right-1 size-7 border bg-background/90 shadow-sm disabled:hidden"
                />
              </Carousel>
            ) : null}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel', { ns: 'common' })}
              </Button>
              <Button type="submit" disabled={submitting}>
                {t('update.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export function OrderDetailsPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation('orders')
  const { t: ts } = useTranslation('statuses')
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [itemModal, setItemModal] = useState<'create' | 'edit' | null>(null)
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const [statusItem, setStatusItem] = useState<OrderItem | null>(null)
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})
  const [customerEditOpen, setCustomerEditOpen] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)

  const invalidateOrder = () => {
    void queryClient.invalidateQueries({ queryKey: ['order', id] })
    void queryClient.invalidateQueries({ queryKey: ['orders'] })
    void queryClient.invalidateQueries({ queryKey: ['order-status-history', id] })
    void queryClient.invalidateQueries({ queryKey: ['customers'] })
  }

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: Boolean(id),
  })

  const { data: trackingLink } = useQuery({
    queryKey: ['order-tracking-link', id],
    queryFn: () => ordersApi.getTrackingLink(id),
    enabled: Boolean(id),
  })

  const {
    data: qrBlob,
    isLoading: qrLoading,
    isError: qrError,
    refetch: refetchQr,
  } = useQuery({
    queryKey: ['order-qr', id],
    queryFn: () => ordersApi.getOrderQrBlob(id),
    enabled: Boolean(id),
    staleTime: Infinity,
  })

  const [qrObjectUrl, setQrObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!qrBlob) {
      setQrObjectUrl(null)
      return
    }

    const url = URL.createObjectURL(qrBlob)
    setQrObjectUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [qrBlob])

  const { data: history } = useQuery({
    queryKey: ['order-status-history', id],
    queryFn: () => statusesApi.getOrderStatusHistory(id),
    enabled: Boolean(id),
  })

  const addItemMutation = useMutation({
    mutationFn: (payload: UpsertOrderItemRequest) => ordersApi.addOrderItem(id, payload),
    onSuccess: () => {
      invalidateOrder()
      setItemModal(null)
      setItemError(null)
    },
    onError: (err: unknown) => {
      setItemError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpsertOrderItemRequest }) =>
      ordersApi.updateOrderItem(id, itemId, payload),
    onSuccess: () => {
      invalidateOrder()
      setItemModal(null)
      setEditingItem(null)
      setItemError(null)
    },
    onError: (err: unknown) => {
      setItemError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => ordersApi.deleteOrderItem(id, itemId),
    onSuccess: () => invalidateOrder(),
  })

  const orderStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateOrderStatus(id, status),
    onSuccess: () => invalidateOrder(),
  })

  const updateOrderMutation = useMutation({
    mutationFn: (patch: {
      expectedDeliveryAt?: string | null
      createdAt?: string
    }) =>
      ordersApi.updateOrder(id, {
        customerId: order!.customerId,
        adminNotes: order!.adminNotes,
        expectedDeliveryAt:
          patch.expectedDeliveryAt !== undefined
            ? patch.expectedDeliveryAt
            : order!.expectedDeliveryAt,
        createdAt: patch.createdAt ?? order!.createdAt,
      }),
    onSuccess: () => invalidateOrder(),
  })

  const { data: customerDetails, isLoading: customerDetailsLoading } = useQuery({
    queryKey: ['customer', order?.customerId],
    queryFn: () => customersApi.getCustomer(order!.customerId!),
    enabled: customerEditOpen && Boolean(order?.customerId),
  })

  const saveCustomerMutation = useMutation({
    mutationFn: async (data: UpsertCustomerRequest) => {
      if (order!.customerId) {
        return customersApi.updateCustomer(order!.customerId, data)
      }
      const created = await customersApi.createCustomer(data)
      await ordersApi.updateOrder(id, {
        customerId: created.id,
        adminNotes: order!.adminNotes,
        expectedDeliveryAt: order!.expectedDeliveryAt,
        createdAt: order!.createdAt,
      })
      return created
    },
    onSuccess: (saved) => {
      setCustomerError(null)
      setCustomerEditOpen(false)
      invalidateOrder()
      void queryClient.invalidateQueries({ queryKey: ['customer', saved.id] })
    },
    onError: (err: unknown) => {
      setCustomerError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateOrderItemStatusRequest }) =>
      statusesApi.updateOrderItemStatus(id, itemId, payload),
    onSuccess: () => {
      invalidateOrder()
      setStatusItem(null)
      setStatusError(null)
    },
    onError: (err: unknown) => {
      setStatusError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
  }

  if (isError || !order) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/orders" className="text-sm text-primary hover:underline">
          ← {t('details.back')}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              <span>{t('details.title')}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 font-mono text-base font-semibold transition-colors hover:bg-primary/15"
                title={copiedCode ? t('codeCopied') : t('copyCode')}
                onClick={async () => {
                  await navigator.clipboard.writeText(order.trackingCode)
                  setCopiedCode(true)
                  window.setTimeout(() => setCopiedCode(false), 2000)
                }}
              >
                <span className="text-foreground">№</span>
                <span className="text-primary">{order.trackingCode}</span>
                <Copy
                  className={
                    copiedCode
                      ? 'size-4 shrink-0 text-primary'
                      : 'size-4 shrink-0 text-muted-foreground'
                  }
                />
              </button>
            </h1>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-8 min-[600px]:flex-row min-[600px]:items-stretch min-[600px]:justify-between min-[600px]:gap-8 lg:gap-16">
          <div className="flex min-w-0 w-full max-w-xs shrink-0 flex-col self-center min-[600px]:self-start">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">{t('details.customer')}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={t('details.editCustomer')}
                aria-label={t('details.editCustomer')}
                onClick={() => {
                  setCustomerError(null)
                  setCustomerEditOpen(true)
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <CustomerField
                label={t('details.customerFullName')}
                value={order.customerName}
                emptyLabel={t('details.emptyValue')}
              />
              <CustomerField
                label={t('details.customerPhone')}
                value={order.customerPhone}
                emptyLabel={t('details.emptyValue')}
              />
              <CustomerField
                label={t('details.customerTelegram')}
                value={formatTelegram(order.customerTelegram)}
                emptyLabel={t('details.emptyValue')}
                href={telegramHref(order.customerTelegram)}
              />
              <CustomerField
                label="WhatsApp"
                value={order.customerWhatsApp}
                emptyLabel={t('details.emptyValue')}
              />
              <CustomerField
                label="VK"
                value={order.customerVk}
                emptyLabel={t('details.emptyValue')}
                href={order.customerVk?.startsWith('http') ? order.customerVk : null}
              />
              <CustomerField
                label={t('details.customerEmail')}
                value={order.customerEmail}
                emptyLabel={t('details.emptyValue')}
                href={
                  order.customerEmail?.trim()
                    ? `mailto:${order.customerEmail.trim()}`
                    : null
                }
              />
              <div className="flex items-baseline gap-3 text-sm">
                <span className="shrink-0 text-muted-foreground">
                  {t('details.createdAt')}:
                </span>
                <DateTimePicker
                  value={order.createdAt}
                  disabled={updateOrderMutation.isPending}
                  dayPresets={STATUS_HISTORY_DAY_PRESETS}
                  className="h-8 min-w-0 flex-1"
                  onChange={(iso) => {
                    if (!iso) return
                    updateOrderMutation.mutate({ createdAt: iso })
                  }}
                />
              </div>
              <div className="flex items-baseline gap-3 text-sm">
                <span className="shrink-0 text-muted-foreground">
                  {t('details.expectedDeliveryAt')}:
                </span>
                <DatePicker
                  value={
                    order.expectedDeliveryAt
                      ? formatYmd(new Date(order.expectedDeliveryAt))
                      : undefined
                  }
                  disabled={updateOrderMutation.isPending}
                  placeholder={t('details.expectedDeliveryPlaceholder')}
                  align="end"
                  className="h-8 min-w-0 flex-1 justify-end"
                  onChange={(ymd) => {
                    if (!ymd) {
                      updateOrderMutation.mutate({ expectedDeliveryAt: null })
                      return
                    }
                    const date = parseYmdLocal(ymd)
                    updateOrderMutation.mutate({
                      expectedDeliveryAt: date ? date.toISOString() : null,
                    })
                  }}
                />
              </div>
            </div>
            <div className="mt-6 sm:mt-auto sm:pt-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={orderStatusMutation.isPending}
                    title={t('details.changeStatus')}
                    className={cn(
                      'inline-flex h-7 w-fit max-w-full items-center gap-1.5 rounded-md px-2 text-left text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80 disabled:opacity-50',
                      (orderStatusStyles[order.status] ?? orderStatusStyles.AwaitingPayment)
                        .chipSoft,
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        (orderStatusStyles[order.status] ?? orderStatusStyles.AwaitingPayment).dot,
                      )}
                    />
                    <span className="min-w-0 leading-none">
                      {t(`details.orderStatus.${order.status}`)}
                    </span>
                    <RefreshCw className="size-3 shrink-0 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-48">
                  {ORDER_STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      disabled={orderStatusMutation.isPending}
                      onSelect={() => {
                        if (status === order.status) return
                        orderStatusMutation.mutate(status)
                      }}
                    >
                      <Check
                        className={cn(
                          'size-4',
                          status === order.status ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {t(`details.orderStatus.${status}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {trackingLink ? (
            <div className="flex w-44 shrink-0 flex-col gap-2 self-center min-[600px]:self-start">
              {qrLoading ? (
                <p className="text-xs text-muted-foreground">{t('details.qrLoading')}</p>
              ) : qrObjectUrl ? (
                <img
                  src={qrObjectUrl}
                  alt={t('details.qrAlt', { code: order.trackingCode })}
                  className="h-44 w-44 rounded-lg border bg-card p-2"
                />
              ) : qrError ? (
                <button
                  type="button"
                  className="h-44 w-44 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50"
                  onClick={() => void refetchQr()}
                >
                  {t('details.qrRetry')}
                </button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => void ordersApi.downloadOrderQr(id, order.trackingCode)}
              >
                <Download />
                {t('details.downloadQr')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  await navigator.clipboard.writeText(trackingLink.trackingUrl)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 2000)
                }}
              >
                <Copy />
                {copied ? t('linkCopied') : t('copyLink')}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between space-y-0">
          <CardTitle>{t('details.items')}</CardTitle>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingItem(null)
              setItemError(null)
              setItemModal('create')
            }}
          >
            <Plus />
            {t('details.add')}
          </Button>
        </CardHeader>
        <CardContent>
          {!order.items.length ? (
            <p className="text-sm text-muted-foreground">{t('details.noItems')}</p>
          ) : (
            <ul className="divide-y">
              {order.items.map((item) => {
                const itemHistory = (history ?? []).filter(
                  (entry) => entry.orderItemId === item.id,
                )
                const historyOpen = Boolean(expandedHistory[item.id])

                return (
                  <li key={item.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {item.name}
                          {item.itemType === 'Product' ? (
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              · ×{item.quantity}
                            </span>
                          ) : null}
                          {isFiniteMoney(item.unitPrice) ? (
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              ·{' '}
                              {formatMoney(
                                item.unitPrice *
                                  (item.itemType === 'Product' ? item.quantity : 1),
                                item.currencyCode ?? 'RUB',
                                i18n.language === 'ru' ? 'ru-RU' : 'en-US',
                              )}
                            </span>
                          ) : null}
                        </p>
                        {item.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                        {item.sourceUrl ? (
                          <a
                            className="mt-1 block text-sm text-primary hover:underline"
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Открыть товар в магазине
                          </a>
                        ) : null}
                        <Badge className="mt-2" variant="secondary">
                          {item.currentStatusText ?? '—'}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingItem(item)
                            setItemError(null)
                            setItemModal('edit')
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            if (window.confirm(t('details.deleteItemConfirm'))) {
                              deleteItemMutation.mutate(item.id)
                            }
                          }}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-base font-medium text-foreground transition-opacity hover:opacity-70"
                          onClick={() =>
                            setExpandedHistory((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                        >
                          <ChevronDown
                            className={cn(
                              'size-4 transition-transform',
                              historyOpen && 'rotate-180',
                            )}
                          />
                          {ts('update.history')}
                          {itemHistory.length > 0 ? (
                            <span className="tabular-nums">({itemHistory.length})</span>
                          ) : null}
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-neutral-900 text-white hover:bg-neutral-800"
                          onClick={() => {
                            setStatusItem(item)
                            setStatusError(null)
                          }}
                        >
                          <Plus />
                          {ts('update.addStatus')}
                        </Button>
                      </div>
                      {historyOpen ? (
                        <div className="mt-3">
                          <ItemStatusTimeline
                            orderId={id}
                            orderCreatedAt={order.createdAt}
                            history={itemHistory}
                            onPhotosUploaded={invalidateOrder}
                          />
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ItemFormDialog
        open={itemModal === 'create'}
        title={t('details.addItemTitle')}
        showItemType={false}
        initial={{
          itemType: 'Product',
          name: '',
          description: '',
          quantity: '1',
          unitPrice: '',
          currencyCode: 'RUB',
        }}
        error={itemError}
        submitting={addItemMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setItemModal(null)
        }}
        onSubmit={(payload) => addItemMutation.mutate(payload)}
      />

      <OrderCustomerEditDialog
        key={
          customerEditOpen
            ? `${order.customerId ?? 'new'}-${customerDetails?.id ?? 'draft'}-${customerDetailsLoading ? 'loading' : 'ready'}`
            : 'customer-edit-closed'
        }
        open={customerEditOpen}
        loading={Boolean(order.customerId) && customerDetailsLoading}
        initial={{
          lastName: customerDetails?.lastName ?? (!customerDetails ? (order.customerName ?? '') : ''),
          firstName: customerDetails?.firstName ?? '',
          patronymic: customerDetails?.patronymic ?? '',
          telegram: customerDetails?.telegram ?? order.customerTelegram ?? '',
          phone: customerDetails?.phone ?? order.customerPhone ?? '',
          whatsApp: customerDetails?.whatsApp ?? order.customerWhatsApp ?? '',
          vk: customerDetails?.vk ?? order.customerVk ?? '',
          email: customerDetails?.email ?? order.customerEmail ?? '',
          notes: customerDetails?.notes ?? '',
        }}
        error={customerError}
        submitting={saveCustomerMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setCustomerEditOpen(false)
            setCustomerError(null)
          } else {
            setCustomerEditOpen(true)
          }
        }}
        onSubmit={(data) => saveCustomerMutation.mutate(data)}
      />

      <ItemFormDialog
        key={editingItem?.id ?? 'edit-item'}
        open={itemModal === 'edit' && Boolean(editingItem)}
        title={t('details.editItemTitle')}
        initial={{
          itemType: editingItem?.itemType === 'Service' ? 'Service' : 'Product',
          name: editingItem?.name ?? '',
          description: editingItem?.description ?? '',
          quantity: String(editingItem?.quantity ?? 1),
          unitPrice: editingItem?.unitPrice?.toString() ?? '',
          currencyCode: editingItem?.currencyCode ?? 'RUB',
        }}
        error={itemError}
        submitting={updateItemMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setItemModal(null)
            setEditingItem(null)
          }
        }}
        onSubmit={(payload) => {
          if (!editingItem) return
          updateItemMutation.mutate({ itemId: editingItem.id, payload })
        }}
      />

      {statusItem ? (
        <StatusUpdateDialog
          open={Boolean(statusItem)}
          item={statusItem}
          orderCreatedAt={order.createdAt}
          error={statusError}
          submitting={statusMutation.isPending}
          onOpenChange={(open) => {
            if (!open) setStatusItem(null)
          }}
          onSubmit={(payload) =>
            statusMutation.mutate({ itemId: statusItem.id, payload })
          }
        />
      ) : null}
    </div>
  )
}
