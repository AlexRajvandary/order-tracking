import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, Link2Off, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import * as adminsApi from '@/features/admins/api/adminsApi'
import type {
  AdminRole,
  AdminUser,
  CreateAdminRequest,
  UpdateAdminRequest,
} from '@/features/admins/types'
import { isAdminRole } from '@/features/admins/types'
import { useAuth } from '@/features/auth/model/AuthContext'
import { getTelegramConfig } from '@/features/auth/api/telegramAuth'
import { TelegramLoginButton } from '@/features/auth/ui/TelegramLoginButton'
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
import { DataTable } from '@/shared/ui/data-table'
import { cn } from '@/shared/lib/utils'

const ALL_ROLES: AdminRole[] = ['Moderator', 'Admin', 'SuperAdmin']

function formatDate(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

function formatDateTime(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function canManageAdmins(role: string | null | undefined) {
  return role === 'Admin' || role === 'SuperAdmin'
}

function canManageTarget(actorRole: string | null | undefined, target: AdminUser) {
  if (actorRole === 'SuperAdmin') return true
  if (actorRole === 'Admin' && target.role === 'Moderator') return true
  return false
}

function creatableRoles(actorRole: string | null | undefined): AdminRole[] {
  if (actorRole === 'SuperAdmin') return ALL_ROLES
  if (actorRole === 'Admin') return ['Moderator']
  return []
}

export function AdminsPage() {
  const { t } = useTranslation('admins')
  const { user } = useAuth()
  const actorRole = user?.role
  const queryClient = useQueryClient()
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null)
  const [bindAdmin, setBindAdmin] = useState<AdminUser | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [createRole, setCreateRole] = useState<AdminRole>('Moderator')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editRole, setEditRole] = useState<AdminRole>('Moderator')

  const createRoleOptions = useMemo(() => creatableRoles(actorRole), [actorRole])
  const canCreate = createRoleOptions.length > 0
  const canEditRole = actorRole === 'SuperAdmin'
  const editingSelf = Boolean(editAdmin && user?.id === editAdmin.id)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admins'],
    queryFn: adminsApi.getAdmins,
    refetchInterval: 30_000,
    enabled: canManageAdmins(actorRole),
  })

  const { data: telegramConfig } = useQuery({
    queryKey: ['telegram-config'],
    queryFn: getTelegramConfig,
    enabled: canManageAdmins(actorRole),
  })

  const createMutation = useMutation({
    mutationFn: (request: CreateAdminRequest) => adminsApi.createAdmin(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admins'] })
      setCreateOpen(false)
      setFormError(null)
      setLogin('')
      setPassword('')
      setDisplayName('')
      setCreateRole(createRoleOptions[0] ?? 'Moderator')
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateAdminRequest }) =>
      adminsApi.updateAdmin(id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admins'] })
      setEditAdmin(null)
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const bindMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof adminsApi.bindTelegram>[1] }) =>
      adminsApi.bindTelegram(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admins'] })
      setBindAdmin(null)
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    },
  })

  const unbindMutation = useMutation({
    mutationFn: (id: string) => adminsApi.unbindTelegram(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admins'] })
      setEditAdmin(null)
    },
  })

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        id: 'login',
        accessorKey: 'login',
        enableColumnFilter: false,
        meta: { label: t('columns.login') },
        header: () => t('columns.login'),
        cell: ({ row }) => <span className="font-medium">{row.original.login}</span>,
      },
      {
        id: 'displayName',
        accessorKey: 'displayName',
        enableColumnFilter: false,
        meta: { label: t('columns.displayName') },
        header: () => t('columns.displayName'),
        cell: ({ row }) => row.original.displayName ?? '—',
      },
      {
        id: 'role',
        accessorFn: (row) =>
          isAdminRole(row.role) ? t(`roles.${row.role}`) : row.role,
        enableColumnFilter: false,
        meta: { label: t('columns.role') },
        header: () => t('columns.role'),
        cell: ({ row }) =>
          isAdminRole(row.original.role)
            ? t(`roles.${row.original.role}`)
            : row.original.role,
      },
      {
        id: 'telegram',
        accessorFn: (row) => row.telegramUsername ?? row.telegramId ?? '',
        enableColumnFilter: false,
        meta: { label: t('columns.telegram') },
        header: () => t('columns.telegram'),
        cell: ({ row }) =>
          row.original.telegramId ? (
            <span className="text-sm">
              {row.original.telegramUsername
                ? `@${row.original.telegramUsername}`
                : `id:${row.original.telegramId}`}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'account',
        accessorFn: (row) => (row.isActive ? 'enabled' : 'disabled'),
        enableColumnFilter: false,
        meta: { label: t('columns.account') },
        header: () => t('columns.account'),
        cell: ({ row }) => (
          <Badge variant="secondary">
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                row.original.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/50',
              )}
            />
            {row.original.isActive ? t('account.enabled') : t('account.disabled')}
          </Badge>
        ),
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
        id: 'lastSeenAt',
        accessorKey: 'lastSeenAt',
        enableColumnFilter: false,
        enableHiding: true,
        meta: { label: t('columns.lastSeen') },
        header: () => t('columns.lastSeen'),
        cell: ({ row }) =>
          row.original.lastSeenAt ? formatDateTime(row.original.lastSeenAt) : '—',
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        enableColumnFilter: false,
        meta: { label: t('columns.created') },
        header: () => t('columns.created'),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [t],
  )

  if (!canManageAdmins(actorRole)) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
      </Alert>
    )
  }

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
          ) : (
            <DataTable
              tableId="admins"
              columns={columns}
              data={data ?? []}
              pageSize={20}
              emptyMessage={t('empty')}
              toolbarContainer={toolbarSlot}
              getRowClassName={(row) =>
                canManageTarget(actorRole, row.original) ? 'cursor-pointer' : undefined
              }
              onRowClick={(row) => {
                if (!canManageTarget(actorRole, row.original)) return
                setFormError(null)
                setEditAdmin(row.original)
                setEditDisplayName(row.original.displayName ?? '')
                setEditActive(row.original.isActive)
                setEditRole(isAdminRole(row.original.role) ? row.original.role : 'Moderator')
              }}
            />
          )}
        </CardContent>
      </Card>

      {canCreate ? (
        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 lg:static lg:mx-0 lg:flex lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <Button
            type="button"
            className="w-full lg:w-auto"
            onClick={() => {
              setFormError(null)
              setCreateRole(createRoleOptions[0] ?? 'Moderator')
              setCreateOpen(true)
            }}
          >
            <Plus />
            {t('add')}
          </Button>
        </div>
      ) : null}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('form.createTitle')}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate({
                login,
                password,
                displayName: displayName || null,
                role: createRole,
              })
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="admin-login">{t('form.login')}</Label>
              <Input
                id="admin-login"
                value={login}
                required
                autoComplete="off"
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">{t('form.password')}</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                required
                minLength={6}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-displayName">{t('form.displayName')}</Label>
              <Input
                id="admin-displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.role')}</Label>
              {createRoleOptions.length === 1 ? (
                <Input value={t(`roles.${createRoleOptions[0]}`)} readOnly className="bg-muted/40" />
              ) : (
                <Select
                  value={createRole}
                  onValueChange={(value) => {
                    if (isAdminRole(value)) setCreateRole(value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {createRoleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`roles.${role}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('form.createHint')}</p>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {t('cancel', { ns: 'common' })}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {t('save', { ns: 'common' })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editAdmin)}
        onOpenChange={(open) => {
          if (!open) setEditAdmin(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('form.editTitle')}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!editAdmin) return
              updateMutation.mutate({
                id: editAdmin.id,
                request: {
                  displayName: editDisplayName || null,
                  isActive: editActive,
                  role: canEditRole && !editingSelf ? editRole : null,
                },
              })
            }}
          >
            <p className="text-sm text-muted-foreground">
              {t('form.login')}: <span className="font-medium text-foreground">{editAdmin?.login}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="edit-displayName">{t('form.displayName')}</Label>
              <Input
                id="edit-displayName"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
              />
            </div>
            {canEditRole ? (
              <div className="space-y-1.5">
                <Label>{t('form.role')}</Label>
                <Select
                  value={editRole}
                  disabled={editingSelf}
                  onValueChange={(value) => {
                    if (isAdminRole(value)) setEditRole(value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`roles.${role}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>{t('form.role')}</Label>
                <Input
                  value={
                    editAdmin && isAdminRole(editAdmin.role)
                      ? t(`roles.${editAdmin.role}`)
                      : (editAdmin?.role ?? '')
                  }
                  readOnly
                  className="bg-muted/40"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editActive}
                disabled={editingSelf}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              {t('form.isActive')}
            </label>
            {editAdmin?.telegramId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (window.confirm(t('unbindConfirm'))) {
                    unbindMutation.mutate(editAdmin.id)
                  }
                }}
                disabled={unbindMutation.isPending}
              >
                <Link2Off />
                {t('unbindTelegram')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!editAdmin) return
                  setFormError(null)
                  setBindAdmin(editAdmin)
                  setEditAdmin(null)
                }}
              >
                <Link2 />
                {t('bindTelegram')}
              </Button>
            )}
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditAdmin(null)}>
                {t('cancel', { ns: 'common' })}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {t('save', { ns: 'common' })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(bindAdmin)}
        onOpenChange={(open) => {
          if (!open) setBindAdmin(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bindTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('bindHint', { login: bindAdmin?.login })}
            </p>
            {telegramConfig?.enabled && telegramConfig.botUsername ? (
              <TelegramLoginButton
                botUsername={telegramConfig.botUsername}
                onAuth={(payload) => {
                  if (!bindAdmin) return
                  bindMutation.mutate({ id: bindAdmin.id, payload })
                }}
                onError={(message) => setFormError(message)}
              />
            ) : (
              <Alert>
                <AlertDescription>{t('telegramNotConfigured')}</AlertDescription>
              </Alert>
            )}
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBindAdmin(null)}>
                {t('cancel', { ns: 'common' })}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
