import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import * as customersApi from '@/features/customers/api/customersApi'
import type { CustomerAddress } from '@/features/customers/types'
import { formatTelegram, telegramHref } from '@/shared/lib/telegram'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { DataTable } from '@/shared/ui/data-table'

export function CustomerDetailsPage() {
  const { t } = useTranslation('customers')
  const { id = '' } = useParams()

  const customerQuery = useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.getCustomer(id),
    enabled: Boolean(id),
  })

  const addressesQuery = useQuery({
    queryKey: ['customers', id, 'addresses'],
    queryFn: () => customersApi.getCustomerAddresses(id),
    enabled: Boolean(id),
  })

  const columns = useMemo<ColumnDef<CustomerAddress>[]>(
    () => [
      {
        id: 'city',
        accessorFn: (row) => row.city ?? '',
        enableColumnFilter: false,
        meta: { label: t('addresses.columns.city') },
        header: () => t('addresses.columns.city'),
        cell: ({ row }) => row.original.city ?? '',
      },
      {
        id: 'street',
        accessorFn: (row) => row.street ?? '',
        enableColumnFilter: false,
        meta: { label: t('addresses.columns.street') },
        header: () => t('addresses.columns.street'),
        cell: ({ row }) => row.original.street ?? '',
      },
      {
        id: 'building',
        accessorFn: (row) => row.building ?? '',
        enableColumnFilter: false,
        meta: { label: t('addresses.columns.building') },
        header: () => t('addresses.columns.building'),
        cell: ({ row }) => row.original.building ?? '',
      },
      {
        id: 'apartment',
        accessorFn: (row) => row.apartment ?? '',
        enableColumnFilter: false,
        meta: { label: t('addresses.columns.apartment') },
        header: () => t('addresses.columns.apartment'),
        cell: ({ row }) => row.original.apartment ?? '',
      },
      {
        id: 'postalCode',
        accessorFn: (row) => row.postalCode ?? '',
        enableColumnFilter: false,
        meta: { label: t('addresses.columns.postalCode') },
        header: () => t('addresses.columns.postalCode'),
        cell: ({ row }) => row.original.postalCode ?? '',
      },
      {
        id: 'note',
        accessorFn: (row) => row.note ?? '',
        enableColumnFilter: false,
        meta: { label: t('addresses.columns.note') },
        header: () => t('addresses.columns.note'),
        cell: ({ row }) => row.original.note ?? '',
      },
    ],
    [t],
  )

  if (customerQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <div className="space-y-2">
        <Alert variant="destructive">
          <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void customerQuery.refetch()}>
          {t('retry', { ns: 'common' })}
        </Button>
      </div>
    )
  }

  const customer = customerQuery.data

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/customers" className="text-sm text-primary hover:underline">
          ← {t('details.back')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {customer.fullName?.trim() || t('details.untitled')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('details.summary')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t('form.fullName')}</p>
            <p>{customer.fullName ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('form.telegram')}</p>
            {telegramHref(customer.telegram) ? (
              <a
                href={telegramHref(customer.telegram)!}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {formatTelegram(customer.telegram)}
              </a>
            ) : (
              <p>—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('form.phone')}</p>
            <p>{customer.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('form.email')}</p>
            <p>{customer.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">WhatsApp</p>
            <p>{customer.whatsApp ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">VK</p>
            <p>{customer.vk ?? '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">{t('form.notes')}</p>
            <p>{customer.notes ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t('addresses.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {addressesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
          ) : addressesQuery.isError ? (
            <div className="space-y-2">
              <Alert variant="destructive">
                <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => void addressesQuery.refetch()}>
                {t('retry', { ns: 'common' })}
              </Button>
            </div>
          ) : (
            <DataTable
              tableId="customer-addresses"
              columns={columns}
              data={addressesQuery.data ?? []}
              pageSize={10}
              emptyMessage={t('addresses.empty')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
