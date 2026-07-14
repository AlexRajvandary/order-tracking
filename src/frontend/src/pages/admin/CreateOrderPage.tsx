import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as customersApi from '@/features/customers/api/customersApi'
import * as ordersApi from '@/features/orders/api/ordersApi'
import type { CreateOrderItemInput } from '@/features/orders/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Separator } from '@/shared/ui/separator'
import { Textarea } from '@/shared/ui/textarea'

type DraftItem = CreateOrderItemInput & { key: string }

type NewCustomerForm = {
  fullName: string
  telegram: string
  phone: string
  email: string
}

const NO_CUSTOMER = '__none__'

const emptyNewCustomer: NewCustomerForm = {
  fullName: '',
  telegram: '',
  phone: '',
  email: '',
}

function hasNewCustomerData(customer: NewCustomerForm) {
  return Boolean(
    customer.fullName.trim() ||
      customer.telegram.trim() ||
      customer.phone.trim() ||
      customer.email.trim(),
  )
}

export function CreateOrderPage() {
  const { t } = useTranslation('orders')
  const navigate = useNavigate()
  const [customerId, setCustomerId] = useState(NO_CUSTOMER)
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>(emptyNewCustomer)
  const [adminNotes, setAdminNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: customers } = useQuery({
    queryKey: ['customers', 'for-order'],
    queryFn: () => customersApi.getCustomers(1, 100),
  })

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
      },
    ])
  }

  const patchNewCustomer = (patch: Partial<NewCustomerForm>) => {
    setNewCustomer((prev) => {
      const next = { ...prev, ...patch }
      if (hasNewCustomerData(next)) {
        setCustomerId(NO_CUSTOMER)
      }
      return next
    })
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
          <div className="space-y-1.5">
            <Label>{t('form.existingCustomer')}</Label>
            <Select
              value={customerId}
              onValueChange={(value) => {
                setCustomerId(value)
                if (value !== NO_CUSTOMER) {
                  setNewCustomer(emptyNewCustomer)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('form.customerPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CUSTOMER}>{t('form.noCustomer')}</SelectItem>
                {customers?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {[c.fullName, c.telegram, c.phone, c.email].filter(Boolean).join(' · ') ||
                      c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">{t('form.newCustomer')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('form.fullName')}</Label>
                <Input
                  value={newCustomer.fullName}
                  onChange={(e) => patchNewCustomer({ fullName: e.target.value })}
                  placeholder={t('form.optional')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.telegram')}</Label>
                <Input
                  value={newCustomer.telegram}
                  onChange={(e) => patchNewCustomer({ telegram: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.phone')}</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => patchNewCustomer({ phone: e.target.value })}
                  placeholder={t('form.optional')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.email')}</Label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => patchNewCustomer({ email: e.target.value })}
                  placeholder={t('form.optional')}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('form.adminNotes')}</Label>
            <Textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{t('form.items')}</h2>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => addItem('Product')}>
                  <Plus />
                  {t('form.addProduct')}
                </Button>
                <Button type="button" variant="outline" onClick={() => addItem('Service')}>
                  <Plus />
                  {t('form.addService')}
                </Button>
              </div>
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
                {item.itemType === 'Product' ? (
                  <Input
                    type="number"
                    min={1}
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
                .map(({ itemType, name, description, quantity }) => ({
                  itemType,
                  name: name.trim(),
                  description: description?.trim() || null,
                  quantity: quantity ?? 1,
                }))

              const creatingNew = hasNewCustomerData(newCustomer)

              createMutation.mutate({
                customerId: creatingNew
                  ? null
                  : customerId === NO_CUSTOMER
                    ? null
                    : customerId,
                newCustomer: creatingNew
                  ? {
                      fullName: newCustomer.fullName.trim() || null,
                      telegram: newCustomer.telegram.trim() || null,
                      phone: newCustomer.phone.trim() || null,
                      email: newCustomer.email.trim() || null,
                    }
                  : null,
                adminNotes: adminNotes || null,
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
