import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t('notFound.title')}</CardTitle>
          <CardDescription>{t('notFound.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link to="/">{t('notFound.goHome')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
