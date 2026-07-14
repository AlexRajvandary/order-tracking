import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import * as customersApi from '@/features/customers/api/customersApi'
import type { Customer, UpsertCustomerRequest } from '@/features/customers/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { DataTable, DataTableColumnHeader, dateRangeFilterFn } from '@/shared/ui/data-table'

type FormState = {
  fullName: string
  telegram: string
  phone: string
  email: string
  notes: string
}

const emptyForm: FormState = { fullName: '', telegram: '', phone: '', email: '', notes: '' }

function formatDate(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function CustomerFormDialog({
  open,
  title,
  initial,
  error,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  title: string
  initial: FormState
  error: string | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpsertCustomerRequest) => void
}) {
  const { t } = useTranslation('customers')
  const [form, setForm] = useState<FormState>(initial)

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
            onSubmit({
              fullName: form.fullName || null,
              telegram: form.telegram || null,
              phone: form.phone || null,
              email: form.email || null,
              notes: form.notes || null,
            })
          }}
        >
          <div className="space-y-1.5">
            <Label>{t('form.fullName')}</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('form.telegram')}</Label>
            <Input
              value={form.telegram}
              onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
              placeholder="@username"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('form.phone')}</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('form.email')}</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('form.notes')}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
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
              {t('save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CustomersPage() {
  const { t } = useTranslation('customers')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', activeSearch],
    queryFn: () =>
      activeSearch
        ? customersApi.searchCustomers({ q: activeSearch, page: 1, pageSize: 500 })
        : customersApi.getCustomers(1, 500),
  })

  const createMutation = useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      setModal(null)
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpsertCustomerRequest }) =>
      customersApi.updateCustomer(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      setModal(null)
      setEditingCustomer(null)
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormError(null)
    setModal('edit')
  }

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        id: 'fullName',
        accessorFn: (row) => row.fullName ?? '',
        enableColumnFilter: false,
        meta: { label: t('columns.name') },
        header: () => t('columns.name'),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.fullName ?? '—'}</span>
        ),
      },
      {
        id: 'telegram',
        accessorFn: (row) => row.telegram ?? '',
        enableColumnFilter: false,
        meta: { label: t('columns.telegram') },
        header: () => t('columns.telegram'),
        cell: ({ row }) => row.original.telegram ?? '—',
      },
      {
        id: 'phone',
        accessorFn: (row) => row.phone ?? '',
        enableColumnFilter: false,
        meta: { label: t('columns.phone') },
        header: () => t('columns.phone'),
        cell: ({ row }) => row.original.phone ?? '—',
      },
      {
        id: 'email',
        accessorFn: (row) => row.email ?? '',
        enableColumnFilter: false,
        meta: { label: t('columns.email') },
        header: () => t('columns.email'),
        cell: ({ row }) => row.original.email ?? '—',
      },
      {
        id: 'ordersCount',
        accessorKey: 'ordersCount',
        enableColumnFilter: false,
        meta: { label: t('columns.orders') },
        header: () => t('columns.orders'),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        meta: { label: t('columns.created'), filterVariant: 'dateRange' },
        filterFn: dateRangeFilterFn,
        header: ({ column, table }) => (
          <DataTableColumnHeader column={column} table={table} title={t('columns.created')} />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button
          onClick={() => {
            setFormError(null)
            setModal('create')
          }}
        >
          <Plus />
          {t('add')}
        </Button>
      </div>

      <Card>
        <CardHeader className="sr-only">
          <span>{t('title')}</span>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
          ) : isError ? (
            <div className="space-y-2">
              <Alert variant="destructive">
                <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => void refetch()}>
                {t('retry', { ns: 'common' })}
              </Button>
            </div>
          ) : (
            <DataTable
              tableId="customers"
              columns={columns}
              data={data?.items ?? []}
              pageSize={10}
              emptyMessage={activeSearch ? t('emptySearch') : t('empty')}
              onRowClick={(row) => openEdit(row.original)}
              getRowClassName={() => 'cursor-pointer'}
              toolbar={
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const value = search.trim()
                    if (value.length >= 2) {
                      setActiveSearch(value)
                    }
                  }}
                >
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                  />
                  <Button type="submit" variant="outline">
                    <Search />
                    {t('search')}
                  </Button>
                  {activeSearch ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSearch('')
                        setActiveSearch(null)
                      }}
                    >
                      {t('clearSearch')}
                    </Button>
                  ) : null}
                </form>
              }
            />
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={modal === 'create'}
        title={t('form.createTitle')}
        initial={emptyForm}
        error={formError}
        submitting={createMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setModal(null)
        }}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />

      <CustomerFormDialog
        key={editingCustomer?.id ?? 'edit'}
        open={modal === 'edit' && Boolean(editingCustomer)}
        title={t('form.editTitle')}
        initial={{
          fullName: editingCustomer?.fullName ?? '',
          telegram: editingCustomer?.telegram ?? '',
          phone: editingCustomer?.phone ?? '',
          email: editingCustomer?.email ?? '',
          notes: editingCustomer?.notes ?? '',
        }}
        error={formError}
        submitting={updateMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setModal(null)
            setEditingCustomer(null)
          }
        }}
        onSubmit={(payload) => {
          if (!editingCustomer) return
          updateMutation.mutate({ id: editingCustomer.id, data: payload })
        }}
      />
    </div>
  )
}
