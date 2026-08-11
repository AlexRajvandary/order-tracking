import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as customersApi from '@/features/customers/api/customersApi'
import * as ordersApi from '@/features/orders/api/ordersApi'
import { AiOrderAssistPanel } from '@/features/orders/components/AiOrderAssistPanel'
import type {
  AiOrderDraft,
  CreateOrderDeliveryAddress,
  CreateOrderItemInput,
  CurrencyCode,
} from '@/features/orders/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { SearchableSelect } from '@/shared/ui/searchable-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Textarea } from '@/shared/ui/textarea'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { capitalizeNamePart } from '@/shared/lib/capitalizeNamePart'
import { formatTelegram } from '@/shared/lib/telegram'
import { currencies, formatMoney, isFiniteMoney } from '@/shared/lib/currency'

type DraftItem = Omit<CreateOrderItemInput, 'quantity' | 'unitPrice'> & {
  key: string
  quantity: string
  unitPrice: number | null
}

type NewCustomerForm = {
  lastName: string
  firstName: string
  patronymic: string
  telegram: string
  phone: string
  email: string
}

type DeliveryForm = {
  city: string
  street: string
  building: string
  apartment: string
  postalCode: string
  note: string
}

type CustomerOption = {
  id: string
  label: string
  searchText: string
}

type AddressOption = {
  id: string
  label: string
  searchText: string
  lastUsedAt: string | null
}

const NO_CUSTOMER = '__none__'
const NO_ADDRESS = '__none__'
const SUPPORTED_CURRENCIES = new Set(['RUB', 'USD', 'EUR', 'GBP', 'JPY'])

const emptyNewCustomer: NewCustomerForm = {
  lastName: '',
  firstName: '',
  patronymic: '',
  telegram: '',
  phone: '',
  email: '',
}

const emptyDelivery: DeliveryForm = {
  city: '',
  street: '',
  building: '',
  apartment: '',
  postalCode: '',
  note: '',
}

function hasNewCustomerData(customer: NewCustomerForm) {
  return Boolean(
    customer.lastName.trim() ||
      customer.firstName.trim() ||
      customer.patronymic.trim() ||
      customer.telegram.trim() ||
      customer.phone.trim() ||
      customer.email.trim(),
  )
}

function hasDeliveryData(delivery: DeliveryForm) {
  return Boolean(
    delivery.city.trim() ||
      delivery.street.trim() ||
      delivery.building.trim() ||
      delivery.apartment.trim() ||
      delivery.postalCode.trim() ||
      delivery.note.trim(),
  )
}

function formatAddressLabel(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(', ')
}

function isUncertain(fields: string[], path: string) {
  const needle = path.toLowerCase()
  return fields.some((field) => {
    const f = field.toLowerCase()
    return f === needle || f.endsWith(`.${needle}`) || f.includes(needle)
  })
}

function uncertainClass(active: boolean) {
  return active ? 'ring-2 ring-amber-400/70 border-amber-400' : undefined
}

function toCurrency(code: string | null | undefined): CurrencyCode {
  const normalized = (code ?? 'RUB').trim().toUpperCase()
  return (SUPPORTED_CURRENCIES.has(normalized) ? normalized : 'RUB') as CurrencyCode
}

function buildAdminNotesFromAi(draft: AiOrderDraft): string {
  const parts: string[] = []
  if (draft.comment?.trim()) {
    parts.push(draft.comment.trim())
  }
  if (draft.payment?.prepayment != null) {
    const currency = draft.payment.currencyCode?.trim().toUpperCase() || ''
    parts.push(`Предоплата: ${draft.payment.prepayment}${currency ? ` ${currency}` : ''}`)
  }
  return parts.join('\n')
}

function mapAiItems(draft: AiOrderDraft): DraftItem[] {
  return (draft.items ?? [])
    .filter((item) => item.name?.trim() || item.url?.trim() || item.description?.trim())
    .map((item) => {
      const url = item.url?.trim() || ''
      const descriptionParts = [item.description?.trim(), url].filter(Boolean)
      const itemType =
        item.itemType?.toLowerCase() === 'service' ? ('Service' as const) : ('Product' as const)
      const quantity =
        item.quantity != null && Number.isFinite(item.quantity) && item.quantity >= 1
          ? String(item.quantity)
          : '1'

      return {
        key: crypto.randomUUID(),
        itemType,
        name: (item.name?.trim() || url || item.description?.trim() || '').slice(0, 500),
        description: descriptionParts.join('\n') || null,
        quantity,
        unitPrice:
          item.unitPrice != null && Number.isFinite(item.unitPrice) ? item.unitPrice : null,
        currencyCode: toCurrency(item.currencyCode),
      }
    })
}

export function CreateOrderPage() {
  const { t, i18n } = useTranslation('orders')
  const navigate = useNavigate()
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing')
  const [customerId, setCustomerId] = useState(NO_CUSTOMER)
  const [customerSearch, setCustomerSearch] = useState('')
  const debouncedCustomerSearch = useDebouncedValue(customerSearch)
  const activeCustomerSearch = debouncedCustomerSearch.trim()
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>(emptyNewCustomer)
  const [deliveryMode, setDeliveryMode] = useState<'new' | 'existing'>('new')
  const [deliveryAddressId, setDeliveryAddressId] = useState(NO_ADDRESS)
  const [delivery, setDelivery] = useState<DeliveryForm>(emptyDelivery)
  const [adminNotes, setAdminNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [aiRecognized, setAiRecognized] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [uncertainFields, setUncertainFields] = useState<Array<{ field: string; reason: string }>>(
    [],
  )

  const uncertainPaths = useMemo(
    () => uncertainFields.map((u) => u.field),
    [uncertainFields],
  )

  const selectedExistingCustomerId =
    customerMode === 'existing' && customerId !== NO_CUSTOMER ? customerId : null
  const addressSourceKey =
    customerMode === 'existing' ? selectedExistingCustomerId ?? 'unassigned' : null

  const { data: customers, isFetching: customersLoading } = useQuery({
    queryKey: ['customers', 'for-order', activeCustomerSearch],
    queryFn: ({ signal }) =>
      activeCustomerSearch
        ? customersApi.searchCustomers(
            { q: activeCustomerSearch, page: 1, pageSize: 100 },
            signal,
          )
        : customersApi.getCustomers(1, 100, signal),
  })

  const { data: customerAddresses = [], isFetching: addressesLoading } = useQuery({
    queryKey: ['customers', addressSourceKey, 'addresses'],
    queryFn: ({ signal }) =>
      selectedExistingCustomerId
        ? customersApi.getCustomerAddresses(selectedExistingCustomerId, signal)
        : customersApi.getUnassignedAddresses(signal),
    enabled: Boolean(addressSourceKey),
  })

  useEffect(() => {
    setDeliveryAddressId(NO_ADDRESS)
    if (!addressSourceKey) {
      setDeliveryMode((prev) => (prev === 'existing' ? 'new' : prev))
    }
  }, [addressSourceKey])

  const customerOptions = useMemo<CustomerOption[]>(
    () => [
      {
        id: NO_CUSTOMER,
        label: t('form.noCustomer'),
        searchText: t('form.noCustomer'),
      },
      ...(customers?.items ?? []).map((customer) => {
        const contacts = [
          customer.fullName,
          formatTelegram(customer.telegram),
          customer.phone,
          customer.email,
        ]
          .filter(Boolean)
          .join(' · ')

        return {
          id: customer.id,
          label: contacts || customer.id,
          searchText: contacts,
        }
      }),
    ],
    [customers?.items, t],
  )

  const addressOptions = useMemo<AddressOption[]>(
    () =>
      customerAddresses.map((address) => {
        const label =
          formatAddressLabel([
            address.city,
            address.street,
            address.building
              ? `${t('form.delivery.buildingShort')} ${address.building}`
              : null,
            address.apartment
              ? `${t('form.delivery.apartmentShort')} ${address.apartment}`
              : null,
            address.postalCode,
          ]) || t('form.delivery.unnamedAddress')

        return {
          id: address.id,
          label,
          searchText: [label, address.note].filter(Boolean).join(' '),
          lastUsedAt: address.lastUsedAt,
        }
      }),
    [customerAddresses, t],
  )

  const recentAddressOptions = useMemo(
    () => addressOptions.filter((address) => address.lastUsedAt).slice(0, 5),
    [addressOptions],
  )

  const createMutation = useMutation({
    mutationFn: ordersApi.createOrder,
    onSuccess: (order) => {
      navigate(`/admin/orders/${order.id}`, { replace: true })
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const addItem = (itemType: 'Product' | 'Service') => {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        itemType,
        name: '',
        description: '',
        quantity: '1',
        unitPrice: null,
        currencyCode: 'RUB',
      },
    ])
  }

  const patchNewCustomer = (patch: Partial<NewCustomerForm>) => {
    setNewCustomer((prev) => ({ ...prev, ...patch }))
  }

  const patchDelivery = (patch: Partial<DeliveryForm>) => {
    setDelivery((prev) => ({ ...prev, ...patch }))
  }

  const applyAiDraft = (draft: AiOrderDraft) => {
    setError(null)
    setAiRecognized(true)
    setMissingFields(draft.missingFields ?? [])
    setUncertainFields(draft.uncertainFields ?? [])

    // TODO: suggest matching existing customer by phone/telegram when unambiguous.
    const customer = draft.customer
    if (
      customer &&
      (customer.lastName ||
        customer.firstName ||
        customer.patronymic ||
        customer.telegram ||
        customer.phone ||
        customer.email)
    ) {
      setCustomerMode('new')
      setCustomerId(NO_CUSTOMER)
      setNewCustomer({
        lastName: capitalizeNamePart(customer.lastName ?? ''),
        firstName: capitalizeNamePart(customer.firstName ?? ''),
        patronymic: capitalizeNamePart(customer.patronymic ?? ''),
        telegram: customer.telegram ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
      })
    }

    const nextDelivery = draft.delivery
    if (
      nextDelivery &&
      (nextDelivery.city ||
        nextDelivery.street ||
        nextDelivery.building ||
        nextDelivery.apartment ||
        nextDelivery.postalCode ||
        nextDelivery.note)
    ) {
      setDeliveryMode('new')
      setDeliveryAddressId(NO_ADDRESS)
      setDelivery({
        city: nextDelivery.city ?? '',
        street: nextDelivery.street ?? '',
        building: nextDelivery.building ?? '',
        apartment: nextDelivery.apartment ?? '',
        postalCode: nextDelivery.postalCode ?? '',
        note: nextDelivery.note ?? '',
      })
    }

    const mappedItems = mapAiItems(draft)
    if (mappedItems.length > 0) {
      setItems(mappedItems)
    }

    setAdminNotes(buildAdminNotesFromAi(draft))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/admin/orders" className="text-sm text-primary hover:underline">
          ← {t('details.back')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t('form.title')}</h1>
      </div>

      <AiOrderAssistPanel disabled={createMutation.isPending} onParsed={applyAiDraft} />

      {aiRecognized ? (
        <Alert>
          <AlertDescription className="space-y-2">
            <p className="font-medium">{t('form.ai.recognized')}</p>
            {missingFields.length > 0 ? (
              <div>
                <p>⚠ {t('form.ai.missingTitle')}</p>
                <ul className="list-disc pl-5 text-sm">
                  {missingFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {uncertainFields.length > 0 ? (
              <div>
                <p>⚠ {t('form.ai.uncertainTitle')}</p>
                <ul className="list-disc pl-5 text-sm">
                  {uncertainFields.map((item) => (
                    <li key={`${item.field}-${item.reason}`}>
                      {item.field}: {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-semibold">{t('form.customerInfo')}</h2>

          <Tabs
            value={customerMode}
            onValueChange={(value) => setCustomerMode(value as 'existing' | 'new')}
            className="gap-3"
          >
            <TabsList className="w-full">
              <TabsTrigger value="existing">{t('form.customerFromDb')}</TabsTrigger>
              <TabsTrigger value="new">{t('form.customerNew')}</TabsTrigger>
            </TabsList>

            <TabsContent value="existing">
              <div className="space-y-1.5">
                <SearchableSelect
                  items={customerOptions}
                  value={customerId}
                  onValueChange={setCustomerId}
                  placeholder={t('form.customerPlaceholder')}
                  searchPlaceholder={t('form.customerSearchPlaceholder')}
                  emptyText={t('form.customerSearchEmpty')}
                  loadingText={t('form.customerSearchLoading')}
                  getLabel={(item) => item.label}
                  getValue={(item) => item.id}
                  getSearchText={(item) => item.searchText}
                  onSearchChange={setCustomerSearch}
                  isLoading={customersLoading}
                />
              </div>
            </TabsContent>

            <TabsContent value="new">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('form.lastName')}</Label>
                  <Input
                    className={uncertainClass(isUncertain(uncertainPaths, 'customer.lastName'))}
                    value={newCustomer.lastName}
                    onChange={(e) =>
                      patchNewCustomer({ lastName: capitalizeNamePart(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.firstName')}</Label>
                  <Input
                    className={uncertainClass(isUncertain(uncertainPaths, 'customer.firstName'))}
                    value={newCustomer.firstName}
                    onChange={(e) =>
                      patchNewCustomer({ firstName: capitalizeNamePart(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.patronymic')}</Label>
                  <Input
                    className={uncertainClass(isUncertain(uncertainPaths, 'customer.patronymic'))}
                    value={newCustomer.patronymic}
                    onChange={(e) =>
                      patchNewCustomer({ patronymic: capitalizeNamePart(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.telegram')}</Label>
                  <Input
                    className={uncertainClass(isUncertain(uncertainPaths, 'customer.telegram'))}
                    value={newCustomer.telegram}
                    onChange={(e) => patchNewCustomer({ telegram: e.target.value })}
                    placeholder={t('form.telegramPlaceholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.phone')}</Label>
                  <Input
                    className={uncertainClass(isUncertain(uncertainPaths, 'customer.phone'))}
                    value={newCustomer.phone}
                    onChange={(e) => patchNewCustomer({ phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.email')}</Label>
                  <Input
                    type="email"
                    className={uncertainClass(isUncertain(uncertainPaths, 'customer.email'))}
                    value={newCustomer.email}
                    onChange={(e) => patchNewCustomer({ email: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
            <div>
              <h2 className="font-semibold">{t('form.delivery.title')}</h2>
            </div>

            <Tabs
              value={deliveryMode}
              onValueChange={(value) => setDeliveryMode(value as 'new' | 'existing')}
              className="gap-3"
            >
              <TabsList className="w-full">
                <TabsTrigger value="existing" disabled={!addressSourceKey}>
                  {t('form.delivery.fromDb')}
                </TabsTrigger>
                <TabsTrigger value="new">{t('form.delivery.newAddress')}</TabsTrigger>
              </TabsList>

              <TabsContent value="new">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.building')}</Label>
                    <Input
                      className={uncertainClass(isUncertain(uncertainPaths, 'delivery.building'))}
                      value={delivery.building}
                      onChange={(e) => patchDelivery({ building: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.apartment')}</Label>
                    <Input
                      className={uncertainClass(isUncertain(uncertainPaths, 'delivery.apartment'))}
                      value={delivery.apartment}
                      onChange={(e) => patchDelivery({ apartment: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.street')}</Label>
                    <Input
                      className={uncertainClass(isUncertain(uncertainPaths, 'delivery.street'))}
                      value={delivery.street}
                      onChange={(e) => patchDelivery({ street: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.city')}</Label>
                    <Input
                      className={uncertainClass(isUncertain(uncertainPaths, 'delivery.city'))}
                      value={delivery.city}
                      onChange={(e) => patchDelivery({ city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.postalCode')}</Label>
                    <Input
                      className={uncertainClass(isUncertain(uncertainPaths, 'delivery.postalCode'))}
                      value={delivery.postalCode}
                      onChange={(e) => patchDelivery({ postalCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t('form.delivery.note')}</Label>
                    <Input
                      className={uncertainClass(isUncertain(uncertainPaths, 'delivery.note'))}
                      value={delivery.note}
                      onChange={(e) => patchDelivery({ note: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="existing">
                {addressSourceKey ? (
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.selectAddress')}</Label>
                    <SearchableSelect
                      items={addressOptions}
                      groups={[
                        {
                          label: t('form.delivery.recentAddresses'),
                          items: recentAddressOptions,
                        },
                        {
                          label: t('form.delivery.allAddresses'),
                          items: addressOptions,
                        },
                      ]}
                      value={deliveryAddressId}
                      onValueChange={setDeliveryAddressId}
                      placeholder={t('form.delivery.addressPlaceholder')}
                      searchPlaceholder={t('form.delivery.addressSearchPlaceholder')}
                      emptyText={t('form.delivery.addressSearchEmpty')}
                      loadingText={t('form.delivery.addressSearchLoading')}
                      getLabel={(item) => item.label}
                      getValue={(item) => item.id}
                      getSearchText={(item) => item.searchText}
                      isLoading={addressesLoading}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('form.delivery.selectCustomerFirst')}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{t('form.items')}</h2>
              <Button type="button" variant="outline" onClick={() => addItem('Product')}>
                <Plus />
                {t('form.addProduct')}
              </Button>
            </div>

            {items.map((item, index) => (
              <div
                key={item.key}
                className={`space-y-2 rounded-xl border p-3 ${
                  isUncertain(uncertainPaths, `items[${index}]`) ? 'border-amber-400' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {item.itemType === 'Product' ? t('form.product') : t('form.service')}
                    </Badge>
                    {isUncertain(uncertainPaths, `items[${index}]`) ? (
                      <Badge variant="outline">{t('form.ai.uncertainBadge')}</Badge>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
                <Input
                  className={uncertainClass(isUncertain(uncertainPaths, `items[${index}].name`))}
                  placeholder={t('form.itemName')}
                  value={item.name}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) => (i === index ? { ...it, name: e.target.value } : it)),
                    )
                  }
                />
                <Textarea
                  className={uncertainClass(
                    isUncertain(uncertainPaths, `items[${index}].description`) ||
                      isUncertain(uncertainPaths, `items[${index}].url`),
                  )}
                  rows={2}
                  placeholder={t('form.itemDescription')}
                  value={item.description ?? ''}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) =>
                        i === index ? { ...it, description: e.target.value } : it,
                      ),
                    )
                  }
                />
                <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={item.currencyCode === 'JPY' ? 1 : 0.01}
                    className={uncertainClass(
                      isUncertain(uncertainPaths, `items[${index}].unitPrice`),
                    )}
                    placeholder={t('form.unitPrice')}
                    value={item.unitPrice ?? ''}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index
                            ? {
                                ...it,
                                unitPrice:
                                  e.target.value === '' ? null : Number(e.target.value),
                              }
                            : it,
                        ),
                      )
                    }
                  />
                  <Select
                    value={item.currencyCode ?? 'RUB'}
                    onValueChange={(value) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, currencyCode: value as CurrencyCode } : it,
                        ),
                      )
                    }
                  >
                    <SelectTrigger
                      className={`w-full ${uncertainClass(isUncertain(uncertainPaths, `items[${index}].currencyCode`)) ?? ''}`}
                    >
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
                {item.itemType === 'Product' ? (
                  <Input
                    type="number"
                    min={1}
                    className={uncertainClass(
                      isUncertain(uncertainPaths, `items[${index}].quantity`),
                    )}
                    placeholder={t('form.quantity')}
                    value={item.quantity}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, quantity: e.target.value } : it,
                        ),
                      )
                    }
                  />
                ) : null}
                {isFiniteMoney(item.unitPrice) ? (
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(
                      item.unitPrice *
                        (item.itemType === 'Product'
                          ? Math.max(1, Number(item.quantity) || 1)
                          : 1),
                      item.currencyCode ?? 'RUB',
                      i18n.language === 'ru' ? 'ru-RU' : 'en-US',
                    )}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>{t('form.adminNotes')}</Label>
            <Textarea
              rows={3}
              className={uncertainClass(
                isUncertain(uncertainPaths, 'comment') ||
                  isUncertain(uncertainPaths, 'payment') ||
                  isUncertain(uncertainPaths, 'payment.prepayment'),
              )}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            className="w-full"
            disabled={createMutation.isPending}
            onClick={() => {
              setError(null)
              const validItems = items
                .filter((i) => i.name.trim())
                .map(({ itemType, name, description, quantity, unitPrice, currencyCode }) => {
                  const parsedQuantity = Number(quantity)
                  return {
                    itemType,
                    name: name.trim(),
                    description: description?.trim() || null,
                    quantity:
                      Number.isFinite(parsedQuantity) && parsedQuantity >= 1
                        ? parsedQuantity
                        : 1,
                    unitPrice: unitPrice ?? null,
                    currencyCode: unitPrice == null ? null : (currencyCode ?? 'RUB'),
                  }
                })

              const creatingNew =
                customerMode === 'new' && hasNewCustomerData(newCustomer)

              const selectedAddress =
                deliveryMode === 'existing' && deliveryAddressId !== NO_ADDRESS
                  ? deliveryAddressId
                  : null

              const manualAddress: CreateOrderDeliveryAddress | null =
                deliveryMode === 'new' && hasDeliveryData(delivery)
                  ? {
                      city: delivery.city.trim() || null,
                      street: delivery.street.trim() || null,
                      building: delivery.building.trim() || null,
                      apartment: delivery.apartment.trim() || null,
                      postalCode: delivery.postalCode.trim() || null,
                      note: delivery.note.trim() || null,
                    }
                  : null

              createMutation.mutate({
                customerId:
                  customerMode === 'existing' && customerId !== NO_CUSTOMER
                    ? customerId
                    : null,
                newCustomer: creatingNew
                  ? {
                      lastName: newCustomer.lastName.trim() || null,
                      firstName: newCustomer.firstName.trim() || null,
                      patronymic: newCustomer.patronymic.trim() || null,
                      telegram: newCustomer.telegram.trim() || null,
                      phone: newCustomer.phone.trim() || null,
                      email: newCustomer.email.trim() || null,
                    }
                  : null,
                deliveryAddressId: selectedAddress,
                deliveryAddress: selectedAddress ? null : manualAddress,
                adminNotes: adminNotes.trim() || null,
                items: validItems,
              })
            }}
          >
            {t('form.submit')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
