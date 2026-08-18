import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as productsApi from '@/features/products/api/productsApi'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

function AnnouncementEditor({ initialText }: { initialText: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(false)
  const mutation = useMutation({
    mutationFn: productsApi.updateStorefrontAnnouncement,
    onSuccess: (announcement) => {
      setText(announcement.text)
      setSaved(true)
      void queryClient.invalidateQueries({ queryKey: ['storefront-announcement'] })
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        setSaved(false)
        mutation.mutate(text)
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="storefront-announcement-text">{t('announcement.fieldLabel')}</Label>
        <Textarea
          id="storefront-announcement-text"
          value={text}
          maxLength={1000}
          rows={4}
          placeholder={t('announcement.placeholder')}
          onChange={(event) => setText(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {t('announcement.hint', { count: text.length })}
        </p>
      </div>
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{t('error')}</AlertDescription>
        </Alert>
      ) : null}
      {saved ? (
        <Alert>
          <AlertDescription>{t('announcement.saved')}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? t('loading') : t('save')}
      </Button>
    </form>
  )
}

export function StorefrontAnnouncementPage() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['storefront-announcement'],
    queryFn: ({ signal }) => productsApi.getStorefrontAnnouncement(signal),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Megaphone className="size-6 text-primary" aria-hidden />
          {t('announcement.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('announcement.description')}</p>
      </div>

      {query.isLoading ? <p className="text-sm text-muted-foreground">{t('loading')}</p> : null}
      {query.isError ? <p className="text-sm text-destructive">{t('error')}</p> : null}
      {query.data ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{t('announcement.previewTitle')}</CardTitle>
            <CardDescription>{t('announcement.previewDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AnnouncementEditor key={query.data.updatedAt} initialText={query.data.text} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
