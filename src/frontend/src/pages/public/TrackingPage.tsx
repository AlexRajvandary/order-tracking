import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPublicOrder } from '@/features/tracking/api/trackingApi'
import { TrackingItemCard } from '@/features/tracking/ui/TrackingItemCard'
import type { OrderStatus } from '@/features/orders/types'
import { OrderStatusBadge } from '@/features/orders/ui/OrderStatusBadge'
import { ApiError } from '@/shared/api/client'
import { useTrackingRealtime } from '@/shared/realtime/useTrackingRealtime'
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Globe } from '@/shared/ui/globe'
import { Input } from '@/shared/ui/input'

const ORDER_STATUSES: OrderStatus[] = [
  'AwaitingPayment',
  'InProgress',
  'Completed',
  'Cancelled',
]

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && ORDER_STATUSES.includes(value as OrderStatus)
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDateOnly(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function TrackingPage() {
  const { t, i18n } = useTranslation('tracking')
  const { code } = useParams()
  const navigate = useNavigate()
  const trackingCode = code?.trim().toUpperCase() ?? ''

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public-track', trackingCode],
    queryFn: () => getPublicOrder(trackingCode),
    enabled: trackingCode.length === 5,
    retry: false,
  })

  useTrackingRealtime(trackingCode)

  const products = data?.items.filter((i) => i.type === 'Product') ?? []
  const services = data?.items.filter((i) => i.type === 'Service') ?? []

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!trackingCode ? (
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const input = form.elements.namedItem('trackingCode') as HTMLInputElement
                const value = input.value.trim().toUpperCase()
                if (value.length === 5) {
                  navigate(`/track/${value}`)
                }
              }}
            >
              <Input
                name="trackingCode"
                placeholder={t('placeholder')}
                maxLength={5}
                className="uppercase"
              />
              <Button type="submit" className="sm:w-auto">
                {t('search')}
              </Button>
            </form>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('orderNumber')}:{' '}
                <span className="font-mono font-semibold text-primary">{trackingCode}</span>
              </p>
              {data ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('createdAt')}:{' '}
                    <span className="font-medium text-foreground">
                      {formatDate(data.createdAt, i18n.language)}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('expectedDeliveryAt')}:{' '}
                    <span className="font-medium text-foreground">
                      {data.expectedDeliveryAt
                        ? formatDateOnly(data.expectedDeliveryAt, i18n.language)
                        : t('notSpecified')}
                    </span>
                  </p>
                  {isOrderStatus(data.status) ? (
                    <div className="pt-2">
                      <OrderStatusBadge
                        status={data.status}
                        label={t(`orderStatus.${data.status}`)}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center py-2">
        <div className="relative aspect-square w-[min(100%,220px)] sm:w-[240px]">
          <Globe
            className="opacity-90"
            size={240}
            dark={0}
            diffuse={1.15}
            mapBrightness={3.2}
            baseColor={[0.92, 0.93, 0.95]}
            markerColor={[0.25, 0.45, 0.85]}
            glowColor={[0.78, 0.84, 0.94]}
            scale={1.02}
          />
        </div>
      </div>

      {trackingCode && trackingCode.length !== 5 ? (
        <Alert variant="destructive">
          <AlertDescription>{t('invalidCode')}</AlertDescription>
        </Alert>
      ) : null}

      {trackingCode.length === 5 && isLoading ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
          </CardContent>
        </Card>
      ) : null}

      {trackingCode.length === 5 && isError ? (
        <Card>
          <CardContent className="space-y-3">
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof ApiError && error.status === 404
                  ? t('notFound')
                  : t('error', { ns: 'common' })}
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => void refetch()}>
              {t('retry', { ns: 'common' })}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <>
          {!data.items.length ? (
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('noItems')}</p>
              </CardContent>
            </Card>
          ) : null}

          {products.length > 0 ? (
            <section className="space-y-3">
              {products.map((item, index) => (
                <TrackingItemCard
                  key={`${item.name}-${index}`}
                  item={item}
                  locale={i18n.language}
                />
              ))}
            </section>
          ) : null}

          {services.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t('services')}</h2>
              {services.map((item, index) => (
                <TrackingItemCard
                  key={`${item.name}-${index}`}
                  item={item}
                  locale={i18n.language}
                />
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
