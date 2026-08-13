import { GitCommitHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { gitHistory } from '@/features/changes/gitHistory'
import { Badge } from '@/shared/ui/badge'

export function ChangesPage() {
  const { t, i18n } = useTranslation('changes')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('count', { count: gitHistory.count })}
        </p>
      </div>

      <div className="divide-y rounded-xl border bg-card">
        {gitHistory.commits.map((commit) => (
          <article
            key={commit.hash}
            className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6"
          >
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-start gap-2">
                <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="font-medium leading-snug">{commit.subject}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-muted-foreground">
                <span>{commit.author}</span>
                <Badge variant="outline" className="font-mono font-normal">
                  {commit.shortHash}
                </Badge>
              </div>
            </div>
            <time
              dateTime={commit.date}
              className="pl-6 text-xs text-muted-foreground sm:pl-0 sm:text-right"
            >
              {new Intl.DateTimeFormat(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(commit.date))}
            </time>
          </article>
        ))}
      </div>
    </div>
  )
}
