import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as statusesApi from '@/features/statuses/api/statusesApi'
import type { StatusDefinition, UpsertStatusRequest } from '@/features/statuses/types'
import { ApiError } from '@/shared/api/client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

type FormState = {
  name: string
  itemType: '' | 'Product' | 'Service'
  color: string
  isActive: boolean
  isFinal: boolean
}

const emptyForm: FormState = {
  name: '',
  itemType: '',
  color: '#3B82F6',
  isActive: true,
  isFinal: false,
}

const ANY_TYPE = '__any__'

export function StatusManagementPage() {
  const { t } = useTranslation('statuses')
  const queryClient = useQueryClient()
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<StatusDefinition | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['statuses', includeInactive],
    queryFn: () => statusesApi.getStatuses({ includeInactive }),
  })

  const createMutation = useMutation({
    mutationFn: (request: UpsertStatusRequest) => statusesApi.createStatus(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['statuses'] })
      setModal(null)
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      request,
      sortOrder,
    }: {
      id: string
      request: FormState
      sortOrder: number
    }) =>
      statusesApi.updateStatus(id, {
        name: request.name,
        itemType: request.itemType || null,
        color: request.color || null,
        sortOrder,
        isActive: request.isActive,
        isFinal: request.isFinal,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['statuses'] })
      setModal(null)
      setEditing(null)
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: statusesApi.deactivateStatus,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['statuses'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormError(null)
            setModal('create')
          }}
        >
          <Plus />
          {t('add')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            {t('showInactive')}
          </label>
        </CardHeader>
        <CardContent>
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
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.name')}</TableHead>
                  <TableHead>{t('columns.itemType')}</TableHead>
                  <TableHead>{t('columns.color')}</TableHead>
                  <TableHead>{t('columns.final')}</TableHead>
                  <TableHead>{t('columns.status')}</TableHead>
                  <TableHead>{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell className="font-medium">{status.name}</TableCell>
                    <TableCell>{status.itemType ?? t('form.anyType')}</TableCell>
                    <TableCell>
                      {status.color ? (
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                          title={status.color}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{status.isFinal ? t('final') : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={status.isActive ? 'secondary' : 'outline'}>
                        {status.isActive ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditing(status)
                            setFormError(null)
                            setModal('edit')
                          }}
                        >
                          <Pencil />
                        </Button>
                        {status.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(t('deactivateConfirm'))) {
                                deactivateMutation.mutate(status.id)
                              }
                            }}
                          >
                            {t('deactivate')}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StatusFormDialog
        key={modal === 'create' ? 'create' : editing?.id ?? 'edit'}
        open={Boolean(modal)}
        title={modal === 'create' ? t('form.createTitle') : t('form.editTitle')}
        initial={
          editing
            ? {
                name: editing.name,
                itemType:
                  editing.itemType === 'Product' || editing.itemType === 'Service'
                    ? editing.itemType
                    : '',
                color: editing.color ?? '#3B82F6',
                isActive: editing.isActive,
                isFinal: editing.isFinal,
              }
            : emptyForm
        }
        showActive={modal === 'edit'}
        error={formError}
        submitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setModal(null)
            setEditing(null)
          }
        }}
        onSubmit={(form) => {
          if (modal === 'create') {
            createMutation.mutate({
              name: form.name,
              itemType: form.itemType || null,
              color: form.color || null,
              sortOrder: 0,
              isFinal: form.isFinal,
            })
          } else if (editing) {
            updateMutation.mutate({
              id: editing.id,
              request: form,
              sortOrder: editing.sortOrder,
            })
          }
        }}
      />
    </div>
  )
}

function StatusFormDialog({
  open,
  title,
  initial,
  showActive,
  error,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  title: string
  initial: FormState
  showActive: boolean
  error: string | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (form: FormState) => void
}) {
  const { t } = useTranslation('statuses')
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
            onSubmit(form)
          }}
        >
          <div className="space-y-1.5">
            <Label>{t('form.name')}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('form.itemType')}</Label>
            <Select
              value={form.itemType || ANY_TYPE}
              onValueChange={(value) =>
                setForm((f) => ({
                  ...f,
                  itemType: value === ANY_TYPE ? '' : (value as 'Product' | 'Service'),
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_TYPE}>{t('form.anyType')}</SelectItem>
                <SelectItem value="Product">{t('form.product', { ns: 'orders' })}</SelectItem>
                <SelectItem value="Service">{t('form.service', { ns: 'orders' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('form.color')}</Label>
            <Input
              type="color"
              value={form.color || '#3B82F6'}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFinal}
              onChange={(e) => setForm((f) => ({ ...f, isFinal: e.target.checked }))}
            />
            {t('form.isFinal')}
          </label>

          {showActive ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              {t('form.isActive')}
            </label>
          ) : null}

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
