import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, HardDrive, ShieldCheck, Users } from 'lucide-react'
import * as dashboardApi from '@/features/dashboard/api/dashboardApi'
import { useStorageMetrics } from '@/features/dashboard/api/useStorageMetrics'
import * as adminsApi from '@/features/admins/api/adminsApi'
import { useAuth } from '@/features/auth/model/AuthContext'
import type { OrderStatus } from '@/features/orders/types'
import { orderStatusStyles } from '@/features/orders/ui/OrderStatusBadge'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/shared/ui/carousel'
import { cn } from '@/shared/lib/utils'

function isOrderStatus(value: string): value is OrderStatus {
  return (
    value === 'AwaitingPayment' ||
    value === 'InProgress' ||
    value === 'Completed' ||
    value === 'Cancelled'
  )
}

function StatCard({
  icon,
  value,
  label,
  onClick,
}: {
  icon: React.ReactNode
  value: number
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block size-[150px] rounded-xl text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
      )}
    >
      <Card className="flex size-[150px] gap-0 p-3 transition-colors hover:border-primary/40 hover:bg-muted/50 sm:p-4">
        <CardContent className="flex h-full flex-col justify-between p-0">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:size-9 [&>svg]:size-4 sm:[&>svg]:size-5">
            {icon}
          </span>
          <span className="space-y-0.5">
            <span className="block text-xl font-bold tabular-nums sm:text-2xl">{value}</span>
            <span className="block text-sm text-muted-foreground">{label}</span>
          </span>
        </CardContent>
      </Card>
    </button>
  )
}

function formatBytes(bytes: number, locale: string) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const
  let value = Math.max(0, bytes)
  let unitIndex = 0

  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000
    unitIndex += 1
  }

  const fractionDigits = unitIndex === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(value)

  return `${formatted} ${units[unitIndex]}`
}

function formatCount(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value)
}

function StorageCard() {
  const { t, i18n } = useTranslation('dashboard')
  const { data, isLoading, isError } = useStorageMetrics()
  const unavailable = t('metrics.storageUnavailable')

  const diskValue =
    data && !data.disk.error
      ? `${formatBytes(data.disk.usedBytes, i18n.language)} / ${formatBytes(data.disk.totalBytes, i18n.language)}`
      : unavailable
  const diskPercentage =
    data && !data.disk.error
      ? `${new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(data.disk.usedPercentage)}%`
      : null
  const databaseValue =
    data && !data.database.error
      ? formatBytes(data.database.sizeBytes, i18n.language)
      : unavailable
  const minioValue =
    data && !data.minio.error
      ? formatBytes(data.minio.sizeBytes, i18n.language)
      : unavailable
  const objectsValue =
    data && !data.minio.error
      ? `${formatCount(data.minio.objectsCount, i18n.language)} ${t('metrics.files')}`
      : null

  return (
    <Card className="flex size-[150px] gap-0 overflow-hidden p-3">
      <CardContent className="flex h-full flex-col p-0">
        <div className="flex items-center gap-1.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&>svg]:size-3.5">
            <HardDrive />
          </span>
          <span className="text-xs font-semibold">{t('metrics.storage')}</span>
        </div>

        {isLoading ? (
          <p className="mt-auto text-xs text-muted-foreground">
            {t('loading', { ns: 'common' })}
          </p>
        ) : isError || !data ? (
          <p className="mt-auto text-xs text-destructive">{unavailable}</p>
        ) : (
          <div className="mt-auto space-y-1 text-[11px] leading-tight">
            <div>
              <p className="text-muted-foreground">{t('metrics.disk')}</p>
              <div className="flex items-baseline justify-between gap-1">
                <p className="font-semibold tabular-nums">{diskValue}</p>
                {diskPercentage ? (
                  <p className="font-semibold tabular-nums">{diskPercentage}</p>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">{t('metrics.database')}</p>
              <p className="font-semibold tabular-nums">{databaseValue}</p>
            </div>
            <div>
              <p className="text-muted-foreground">MinIO</p>
              <div className="flex items-baseline justify-between gap-1">
                <p className="font-semibold tabular-nums">{minioValue}</p>
                {objectsValue ? (
                  <p className="text-muted-foreground tabular-nums">{objectsValue}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatDate(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManageAdmins = user?.role === 'Admin' || user?.role === 'SuperAdmin'
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getDashboardSummary,
  })

  const { data: admins } = useQuery({
    queryKey: ['admins'],
    queryFn: adminsApi.getAdmins,
    enabled: canManageAdmins,
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
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <Carousel opts={{ align: 'start', dragFree: true }}>
        <CarouselContent className="py-2 pl-1">
          <CarouselItem className="basis-auto">
            <StatCard
              icon={<ClipboardList />}
              value={data.totalOrders}
              label={t('metrics.orders')}
              onClick={() => navigate('/admin/orders')}
            />
          </CarouselItem>
          <CarouselItem className="basis-auto">
            <StatCard
              icon={<Users />}
              value={data.totalCustomers}
              label={t('metrics.customers')}
              onClick={() => navigate('/admin/customers')}
            />
          </CarouselItem>
          {canManageAdmins ? (
            <CarouselItem className="basis-auto">
              <StatCard
                icon={<ShieldCheck />}
                value={admins?.length ?? 0}
                label={t('metrics.admins')}
                onClick={() => navigate('/admin/admins')}
              />
            </CarouselItem>
          ) : null}
          <CarouselItem className="basis-auto">
            <StorageCard />
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentOrders')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!data.recentOrders.length ? (
            <p className="text-sm text-muted-foreground">{t('emptyOrders')}</p>
          ) : (
            <ul className="divide-y">
              {data.recentOrders.map((order) => {
                const status = isOrderStatus(order.status)
                  ? order.status
                  : 'AwaitingPayment'
                return (
                  <li
                    key={order.id}
                    className="flex cursor-pointer items-start justify-between gap-3 py-2 -mx-2 px-2 rounded-md hover:bg-muted/50"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <div className="space-y-1">
                      <span className="block font-mono font-medium text-primary">
                        {order.trackingCode}
                      </span>
                      <Badge variant="secondary" className="gap-1.5">
                        <span
                          className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            orderStatusStyles[status].dot,
                          )}
                        />
                        {t(`details.orderStatus.${status}`, { ns: 'orders' })}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
