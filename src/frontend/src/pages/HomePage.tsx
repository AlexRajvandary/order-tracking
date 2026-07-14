import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { pingApi } from '@/shared/api/client'

export function HomePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ping'],
    queryFn: pingApi,
  })

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-4 py-10">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">{t('home.title')}</CardTitle>
          <CardDescription className="text-base">{t('home.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/admin/login">{t('home.adminLogin')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/track">{t('home.trackOrder')}</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            API:{' '}
            {isLoading
              ? t('loading')
              : isError
                ? t('error')
                : `${data?.service} — ${data?.status}`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
