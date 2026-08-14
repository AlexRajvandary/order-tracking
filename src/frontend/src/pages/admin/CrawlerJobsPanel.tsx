import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, LoaderCircle, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as productsApi from '@/features/products/api/productsApi'
import type { Category, CrawlerJob, CrawlerJobStatus } from '@/features/products/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Progress } from '@/shared/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

function categoryOptions(categories: Category[], depth = 0): Array<{ id: string; label: string }> {
  return categories.flatMap((category) => [
    { id: category.id, label: `${'— '.repeat(depth)}${category.name}` },
    ...categoryOptions(category.children, depth + 1),
  ])
}

function statusVariant(status: CrawlerJobStatus) {
  if (status === 'failed') return 'destructive' as const
  if (status === 'completed') return 'default' as const
  return 'secondary' as const
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function JobCard({ job, locale }: { job: CrawlerJob; locale: string }) {
  const { t } = useTranslation('products')
  const hasFinished = job.status === 'completed' || job.status === 'failed'
  const pageLabel = hasFinished
    ? t('import.crawler.finalPage')
    : t('import.crawler.currentPage')
  const completionLabel = job.status === 'failed'
    ? t('import.crawler.interruptedAt')
    : t('import.crawler.finishedAt')

  return (
    <Card size="sm">
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(job.status)}>
                {job.status === 'running' ? <LoaderCircle className="animate-spin" /> : null}
                {t(`import.crawler.statuses.${job.status}`)}
              </Badge>
            </div>
            <p className="text-sm font-medium">{job.categoryPath || job.categoryName}</p>
          </div>
          <a
            href={job.url}
            title={job.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="max-w-64 truncate">{job.url}</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span>{t('import.crawler.progress')}</span>
            <span className="tabular-nums">
              {job.processedPages} / {job.requestedPages} · {job.progressPercent}%
            </span>
          </div>
          <Progress value={job.progressPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <span>{t('import.crawler.found')}: <b>{job.productsFound}</b></span>
          <span>{t('import.inserted')}: <b>{job.importedCount}</b></span>
          <span>{t('import.skipped')}: <b>{job.skippedCount}</b></span>
          <span>{t('import.failed')}: <b>{job.failedCount}</b></span>
        </div>

        <dl className="grid gap-x-4 gap-y-2 border-t pt-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">{t('import.crawler.createdAt')}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{formatDate(job.createdAt, locale)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{completionLabel}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {hasFinished ? formatDate(job.completedAt, locale) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{pageLabel}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {job.lastPage > 0 ? `${job.lastPage} / ${job.requestedPages}` : '—'}
            </dd>
          </div>
        </dl>

        {job.lastError ? (
          <Alert variant="destructive">
            <AlertDescription>{job.lastError}</AlertDescription>
          </Alert>
        ) : null}

        <details className="group rounded-md border px-2.5 py-2">
          <summary className="cursor-pointer select-none text-xs font-medium">
            {t('import.crawler.logs')} ({job.logs.length})
          </summary>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto font-mono text-[11px]">
            {job.logs.length > 0 ? job.logs.map((line) => (
              <p
                key={line.id}
                className={cn(
                  'break-words',
                  line.level === 'error' && 'text-destructive',
                  line.level === 'warning' && 'text-amber-700',
                )}
              >
                <span className="text-muted-foreground">
                  {formatDate(line.createdAt, locale)}
                </span>{' '}
                {line.message}
              </p>
            )) : (
              <p className="text-muted-foreground">{t('import.crawler.noLogs')}</p>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  )
}

export function CrawlerJobsPanel({ categories }: { categories: Category[] }) {
  const { t, i18n } = useTranslation('products')
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')
  const [pages, setPages] = useState('10')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const options = useMemo(() => categoryOptions(categories), [categories])

  const jobsQuery = useQuery({
    queryKey: ['crawler-jobs'],
    queryFn: ({ signal }) => productsApi.listCrawlerJobs(signal),
    refetchInterval: 3000,
  })
  const createMutation = useMutation({
    mutationFn: productsApi.createCrawlerJob,
    onSuccess: async () => {
      setUrl('')
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['crawler-jobs'] })
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof ApiError
          ? mutationError.message
          : t('import.crawler.createError'),
      )
    },
  })

  const submit = () => {
    const pageCount = Number(pages)
    if (!url.trim() || !Number.isInteger(pageCount) || pageCount < 1 || pageCount > 1000 || !categoryId) {
      setError(t('import.crawler.validationError'))
      return
    }
    setError(null)
    createMutation.mutate({ url: url.trim(), pages: pageCount, categoryId })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('import.crawler.description')}</p>
      <div className="space-y-3 rounded-lg border p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <div className="space-y-1.5">
            <Label htmlFor="crawler-url">{t('import.crawler.url')}</Label>
            <Input
              id="crawler-url"
              type="url"
              value={url}
              placeholder="https://maketto.jp/ru/catalog?..."
              disabled={createMutation.isPending}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crawler-pages">{t('import.crawler.pages')}</Label>
            <Input
              id="crawler-pages"
              type="number"
              min="1"
              max="1000"
              value={pages}
              disabled={createMutation.isPending}
              onChange={(event) => setPages(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>{t('import.crawler.category')}</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={createMutation.isPending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('import.crawler.chooseCategory')} />
              </SelectTrigger>
              <SelectContent>
                {options.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={createMutation.isPending} onClick={submit}>
            {createMutation.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
            {t('import.crawler.add')}
          </Button>
        </div>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{t('import.crawler.jobs')}</p>
        {jobsQuery.isFetching ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>
      {jobsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{t('import.crawler.listError')}</AlertDescription>
        </Alert>
      ) : jobsQuery.data?.items.length ? (
        <div className="space-y-2">
          {jobsQuery.data.items.map((job) => (
            <JobCard key={job.id} job={job} locale={i18n.language} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {t('import.crawler.empty')}
        </div>
      )}
    </div>
  )
}
