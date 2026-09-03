import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import * as customersApi from '@/features/customers/api/customersApi'
import type { Customer, UpsertCustomerRequest } from '@/features/customers/types'
import { ApiError } from '@/shared/api/client'
import { cn } from '@/shared/lib/utils'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
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
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { capitalizeNamePart } from '@/shared/lib/capitalizeNamePart'
import { formatTelegram, telegramHref } from '@/shared/lib/telegram'
import { SearchInput } from '@/shared/ui/search-input'
import { Textarea } from '@/shared/ui/textarea'
import { DataTable, DataTableColumnHeader, dateRangeFilterFn } from '@/shared/ui/data-table'

type FormState = {
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

const emptyForm: FormState = {
  lastName: '',
  firstName: '',
  patronymic: '',
  telegram: '',
  phone: '',
  whatsApp: '',
  vk: '',
  email: '',
  notes: '',
}

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
              <Label>{t('form.lastName')}</Label>
              <Input
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: capitalizeNamePart(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.firstName')}</Label>
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: capitalizeNamePart(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.patronymic')}</Label>
              <Input
                value={form.patronymic}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patronymic: capitalizeNamePart(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('form.telegram')}</Label>
            <Input
              value={form.telegram}
              onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
              placeholder={t('form.telegramPlaceholder')}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input
                value={form.whatsApp}
                onChange={(e) => setForm((f) => ({ ...f, whatsApp: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>VK</Label>
              <Input
                value={form.vk}
                onChange={(e) => setForm((f) => ({ ...f, vk: e.target.value }))}
              />
            </div>
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const normalizedSearch = debouncedSearch.trim()
  const activeSearch = normalizedSearch.length >= 2 ? normalizedSearch : null
  const [modal, setModal] = useState<'create' | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', activeSearch],
    queryFn: ({ signal }) =>
      activeSearch
        ? customersApi.searchCustomers({ q: activeSearch, page: 1, pageSize: 500 }, signal)
        : customersApi.getCustomers(1, 500, signal),
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

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        id: 'fullName',
        accessorFn: (row) => row.fullName ?? '',
        enableColumnFilter: false,
        meta: { label: t('columns.name') },
        header: () => t('columns.name'),
        cell: ({ row }) => row.original.fullName ?? '—',
      },
      {
        id: 'telegram',
        accessorFn: (row) => row.telegram ?? '',
        enableColumnFilter: false,
        meta: { label: t('columns.telegram') },
        header: () => t('columns.telegram'),
        cell: ({ row }) => {
          const href = telegramHref(row.original.telegram)
          return href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {formatTelegram(row.original.telegram)}
            </a>
          ) : (
            ''
          )
        },
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
        id: 'presence',
        accessorFn: (row) => (row.isOnline ? 'online' : 'offline'),
        enableColumnFilter: false,
        meta: { label: t('columns.presence') },
        header: () => t('columns.presence'),
        cell: ({ row }) => (
          <Badge variant="secondary">
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                row.original.isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/50',
              )}
            />
            {row.original.isOnline ? t('presence.online') : t('presence.offline')}
          </Badge>
        ),
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
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div ref={setToolbarSlot} />

      <Card size="sm">
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
              onRowClick={(row) => navigate(`/admin/customers/${row.original.id}`)}
              getRowClassName={() => 'cursor-pointer'}
              toolbarContainer={toolbarSlot}
              toolbar={
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={t('searchPlaceholder')}
                />
              }
            />
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 lg:static lg:mx-0 lg:flex lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Button
          className="w-full lg:w-auto"
          onClick={() => {
            setFormError(null)
            setModal('create')
          }}
        >
          <Plus />
          {t('add')}
        </Button>
      </div>

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
    </div>
  )
}
