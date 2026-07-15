import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as customersApi from '@/features/customers/api/customersApi'
import * as ordersApi from '@/features/orders/api/ordersApi'
import type {
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
import { currencies, formatMoney } from '@/shared/lib/currency'

type DraftItem = CreateOrderItemInput & { key: string }

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
      delivery.postalCode.trim(),
  )
}

function formatAddressLabel(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(', ')
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
  const [items, setItems] = useState<DraftItem[]>([])
  const [error, setError] = useState<string | null>(null)

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
        quantity: 1,
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/admin/orders" className="text-sm text-primary hover:underline">
          ← {t('details.back')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t('form.title')}</h1>
      </div>

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
                    value={newCustomer.lastName}
                    onChange={(e) =>
                      patchNewCustomer({ lastName: capitalizeNamePart(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.firstName')}</Label>
                  <Input
                    value={newCustomer.firstName}
                    onChange={(e) =>
                      patchNewCustomer({ firstName: capitalizeNamePart(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.patronymic')}</Label>
                  <Input
                    value={newCustomer.patronymic}
                    onChange={(e) =>
                      patchNewCustomer({ patronymic: capitalizeNamePart(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.telegram')}</Label>
                  <Input
                    value={newCustomer.telegram}
                    onChange={(e) => patchNewCustomer({ telegram: e.target.value })}
                    placeholder={t('form.telegramPlaceholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.phone')}</Label>
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => patchNewCustomer({ phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.email')}</Label>
                  <Input
                    type="email"
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
                      value={delivery.building}
                      onChange={(e) => patchDelivery({ building: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.apartment')}</Label>
                    <Input
                      value={delivery.apartment}
                      onChange={(e) => patchDelivery({ apartment: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.street')}</Label>
                    <Input
                      value={delivery.street}
                      onChange={(e) => patchDelivery({ street: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.city')}</Label>
                    <Input
                      value={delivery.city}
                      onChange={(e) => patchDelivery({ city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('form.delivery.postalCode')}</Label>
                    <Input
                      value={delivery.postalCode}
                      onChange={(e) => patchDelivery({ postalCode: e.target.value })}
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
              <div key={item.key} className="space-y-2 rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {item.itemType === 'Product' ? t('form.product') : t('form.service')}
                  </Badge>
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
                  placeholder={t('form.itemName')}
                  value={item.name}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) => (i === index ? { ...it, name: e.target.value } : it)),
                    )
                  }
                />
                <Textarea
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
                {item.itemType === 'Product' ? (
                  <Input
                    type="number"
                    min={1}
                    placeholder={t('form.quantity')}
                    value={item.quantity ?? 1}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index
                            ? { ...it, quantity: Number(e.target.value) || 1 }
                            : it,
                        ),
                      )
                    }
                  />
                ) : null}
                {item.unitPrice != null ? (
                  <p className="text-sm text-muted-foreground">
                    {t('form.totalPrice')}:{' '}
                    {formatMoney(
                      item.unitPrice * (item.itemType === 'Product' ? (item.quantity ?? 1) : 1),
                      item.currencyCode ?? 'RUB',
                      i18n.language === 'ru' ? 'ru-RU' : 'en-US',
                    )}
                  </p>
                ) : null}
              </div>
            ))}
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
                .map(({ itemType, name, description, quantity, unitPrice, currencyCode }) => ({
                  itemType,
                  name: name.trim(),
                  description: description?.trim() || null,
                  quantity: quantity ?? 1,
                  unitPrice: unitPrice ?? null,
                  currencyCode: unitPrice == null ? null : (currencyCode ?? 'RUB'),
                }))

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
                      note: null,
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
                adminNotes: null,
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
