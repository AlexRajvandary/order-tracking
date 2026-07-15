import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPublicOrder } from '@/features/tracking/api/trackingApi'
import { StatusDot, TrackingItemCard } from '@/features/tracking/ui/TrackingItemCard'
import { ApiError } from '@/shared/api/client'
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher'
import { formatTelegram } from '@/shared/lib/telegram'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function resolveCustomerLabel(order: {
  customerName: string | null
  customerEmail: string | null
  customerTelegram: string | null
}) {
  return (
    order.customerName?.trim() ||
    order.customerEmail?.trim() ||
    formatTelegram(order.customerTelegram) ||
    null
  )
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

  const products = data?.items.filter((i) => i.type === 'Product') ?? []
  const services = data?.items.filter((i) => i.type === 'Service') ?? []
  const customerLabel = data ? resolveCustomerLabel(data) : null

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
              <p className="text-lg">
                <span className="text-muted-foreground">{t('orderNumber')}: </span>
                <span className="font-mono font-semibold text-primary">{trackingCode}</span>
              </p>
              {customerLabel ? (
                <p className="text-sm text-muted-foreground">
                  {t('customer')}:{' '}
                  <span className="font-medium text-foreground">{customerLabel}</span>
                </p>
              ) : null}
              {data ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('lastUpdated')}:{' '}
                    <span className="font-medium text-foreground">
                      {formatDate(data.lastUpdatedAt, i18n.language)}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('createdAt')}:{' '}
                    <span className="font-medium text-foreground">
                      {formatDate(data.createdAt, i18n.language)}
                    </span>
                  </p>
                </>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

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
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <StatusDot className="h-3 w-3" />
                {data.overallIsFinal ? t('overallDelivered') : t('overallInProgress')}
              </h2>
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
