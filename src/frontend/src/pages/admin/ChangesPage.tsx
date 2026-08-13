import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { changeHistory } from '@/features/changes/changeHistory'

export function ChangesPage() {
  const { t, i18n } = useTranslation('changes')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="divide-y rounded-xl border bg-card">
        {changeHistory.entries.map((entry) => (
          <article
            key={entry.id}
            className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-6"
          >
            <div className="flex min-w-0 items-start gap-2">
              <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="font-medium leading-snug">{entry.title}</p>
            </div>
            <time
              dateTime={entry.date}
              className="pl-6 text-xs text-muted-foreground sm:pl-0 sm:text-right"
            >
              {new Intl.DateTimeFormat(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(entry.date))}
            </time>
          </article>
        ))}
      </div>
    </div>
  )
}
