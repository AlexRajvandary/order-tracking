import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as dashboardApi from '@/features/dashboard/api/dashboardApi'
import { translateAuditName } from '@/features/dashboard/lib/auditI18n'
import * as ordersApi from '@/features/orders/api/ordersApi'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

function formatDate(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} readOnly className="bg-muted/40" />
    </div>
  )
}

export function AuditDetailsPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => dashboardApi.getAuditLog(id),
    enabled: Boolean(id),
  })

  const restoreMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.restoreOrder(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['audit', id] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
  }

  if (isError || !data) {
    return (
      <div className="space-y-2">
        <Alert variant="destructive">
          <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void refetch()}>
          {t('retry', { ns: 'common' })}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/audit" className="text-sm text-primary hover:underline">
          ← {t('details.back')}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t('details.title')}</h1>
          {data.canRestore ? (
            <Button
              type="button"
              variant="outline"
              disabled={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate(data.entityId)}
            >
              {t('restore')}
            </Button>
          ) : null}
        </div>
      </div>

      {restoreMutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {restoreMutation.error instanceof ApiError
              ? restoreMutation.error.message
              : t('restoreError')}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('details.summary')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ReadonlyField
            label={t('details.action')}
            value={translateAuditName(t, 'actions', data.action)}
          />
          <ReadonlyField
            label={t('details.entityType')}
            value={translateAuditName(t, 'entities', data.entityType)}
          />
          <ReadonlyField label={t('details.entityId')} value={data.entityId} />
          <ReadonlyField
            label={t('details.admin')}
            value={data.adminLogin ?? t('details.empty')}
          />
          <ReadonlyField
            label={t('details.adminUserId')}
            value={data.adminUserId ?? t('details.empty')}
          />
          <ReadonlyField label={t('details.createdAt')} value={formatDate(data.createdAt)} />
          <ReadonlyField
            label={t('details.ipAddress')}
            value={data.ipAddress ?? t('details.empty')}
          />
          <ReadonlyField
            label={t('details.correlationId')}
            value={data.correlationId ?? t('details.empty')}
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t('details.userAgent')}</Label>
            <Input
              value={data.userAgent ?? t('details.empty')}
              readOnly
              className="bg-muted/40"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('details.changes')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!data.changes.length ? (
            <p className="text-sm text-muted-foreground">{t('details.noChanges')}</p>
          ) : (
            <div className="space-y-3">
              {data.changes.map((change) => (
                <div
                  key={change.field}
                  className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]"
                >
                  <ReadonlyField
                    label={t('details.field')}
                    value={translateAuditName(t, 'fields', change.field)}
                  />
                  <ReadonlyField
                    label={t('details.oldValue')}
                    value={change.oldValue ?? t('changeEmpty')}
                  />
                  <ReadonlyField
                    label={t('details.newValue')}
                    value={change.newValue ?? t('changeEmpty')}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('details.raw')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('details.oldValues')}</Label>
            <Textarea
              value={data.oldValues ?? t('details.empty')}
              readOnly
              rows={8}
              className="font-mono text-xs bg-muted/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('details.newValues')}</Label>
            <Textarea
              value={data.newValues ?? t('details.empty')}
              readOnly
              rows={8}
              className="font-mono text-xs bg-muted/40"
            />
          </div>
        </CardContent>
      </Card>

      {data.entityType === 'Order' ? (
        <Button type="button" variant="outline" onClick={() => navigate(`/admin/orders/${data.entityId}`)}>
          {t('details.openOrder')}
        </Button>
      ) : null}
    </div>
  )
}
