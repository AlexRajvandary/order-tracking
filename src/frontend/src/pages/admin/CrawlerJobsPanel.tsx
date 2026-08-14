import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  CircleX,
  ExternalLink,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as productsApi from '@/features/products/api/productsApi'
import type {
  Category,
  CrawlerJob,
  CrawlerJobStatus,
  CrawlerParser,
} from '@/features/products/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
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
  if (status === 'cancelled') return 'outline' as const
  return 'secondary' as const
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function JobStatus({ status }: { status: CrawlerJobStatus }) {
  const { t } = useTranslation('products')
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4" />
        {t('import.crawler.tableStatuses.completed')}
      </span>
    )
  }
  if (status === 'failed' || status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
        <CircleX className="size-4" />
        {t('import.crawler.tableStatuses.interrupted')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" />
      {t(`import.crawler.tableStatuses.${status}`)}
    </span>
  )
}

function JobDetails({
  job,
  locale,
  isCancelling,
  onBack,
  onCancel,
}: {
  job: CrawlerJob
  locale: string
  isCancelling: boolean
  onBack: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation('products')
  const hasFinished = ['completed', 'failed', 'cancelled'].includes(job.status)
  const pageLabel = hasFinished
    ? t('import.crawler.finalPage')
    : t('import.crawler.currentPage')
  const completionLabel = job.status === 'failed'
    ? t('import.crawler.interruptedAt')
    : job.status === 'cancelled'
      ? t('import.crawler.cancelledAt')
      : t('import.crawler.finishedAt')

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('import.crawler.backToJobs')}
            onClick={onBack}
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">{job.categoryPath || job.categoryName}</p>
            <p className="text-xs text-muted-foreground">
              {t('import.crawler.parser')}: {t(`import.crawler.parsers.${job.parser}`)}
            </p>
            <a
              href={job.url}
              title={job.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="max-w-96 truncate">{job.url}</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
        <Badge variant={statusVariant(job.status)}>
          {job.status === 'running' || job.status === 'pending'
            ? <LoaderCircle className="animate-spin" />
            : null}
          {t(`import.crawler.statuses.${job.status}`)}
        </Badge>
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

      {job.status === 'pending' || job.status === 'running' ? (
        <div className="flex justify-end border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isCancelling}
            onClick={onCancel}
          >
            {isCancelling ? <LoaderCircle className="animate-spin" /> : <X />}
            {isCancelling ? t('import.crawler.cancelling') : t('import.crawler.cancel')}
          </Button>
        </div>
      ) : null}

      <div className="rounded-md border px-2.5 py-2">
        <p className="text-xs font-medium">
          {t('import.crawler.logs')} ({job.logs.length})
        </p>
        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto font-mono text-[11px]">
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
      </div>
    </div>
  )
}

export function CrawlerJobsPanel({ categories }: { categories: Category[] }) {
  const { t, i18n } = useTranslation('products')
  const queryClient = useQueryClient()
  const [parser, setParser] = useState<CrawlerParser>('maketto')
  const [url, setUrl] = useState('')
  const [pages, setPages] = useState('10')
  const [categoryId, setCategoryId] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const options = useMemo(() => categoryOptions(categories), [categories])

  const jobsQuery = useQuery({
    queryKey: ['crawler-jobs'],
    queryFn: ({ signal }) => productsApi.listCrawlerJobs(signal),
    refetchInterval: 3000,
  })
  const jobQuery = useQuery({
    queryKey: ['crawler-job', selectedJobId],
    queryFn: ({ signal }) => productsApi.getCrawlerJob(selectedJobId!, signal),
    enabled: selectedJobId !== null,
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
  const cancelMutation = useMutation({
    mutationFn: productsApi.cancelCrawlerJob,
    onSuccess: async () => {
      setError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['crawler-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['crawler-job', selectedJobId] }),
      ])
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof ApiError
          ? mutationError.message
          : t('import.crawler.cancelError'),
      )
    },
  })
  const clearLogsMutation = useMutation({
    mutationFn: productsApi.clearCrawlerLogs,
    onSuccess: async () => {
      setError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['crawler-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['crawler-job'] }),
      ])
    },
    onError: () => setError(t('import.crawler.clearLogsError')),
  })

  const submit = () => {
    const pageCount = Number(pages)
    if (!url.trim() || !Number.isInteger(pageCount) || pageCount < 1 || pageCount > 1000 || !categoryId) {
      setError(t('import.crawler.validationError'))
      return
    }
    setError(null)
    createMutation.mutate({ parser, url: url.trim(), pages: pageCount, categoryId })
  }

  const selectedJob = jobQuery.data
    ?? jobsQuery.data?.items.find((job) => job.id === selectedJobId)
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('import.crawler.description')}</p>
      <div className="space-y-3 rounded-lg border p-3">
        <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)_8rem]">
          <div className="space-y-1.5">
            <Label>{t('import.crawler.parser')}</Label>
            <Select
              value={parser}
              onValueChange={(value) => {
                setParser(value as CrawlerParser)
                setUrl('')
              }}
              disabled={createMutation.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maketto">{t('import.crawler.parsers.maketto')}</SelectItem>
                <SelectItem value="zozo">{t('import.crawler.parsers.zozo')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crawler-url">{t('import.crawler.url')}</Label>
            <Input
              id="crawler-url"
              type="url"
              value={url}
              placeholder={parser === 'zozo'
                ? 'https://zozo.jp/category/.../'
                : 'https://maketto.jp/ru/catalog?...'}
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
        <div className="flex items-center gap-2">
          {jobsQuery.isFetching || jobQuery.isFetching
            ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
            : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={clearLogsMutation.isPending}
            onClick={() => {
              if (window.confirm(t('import.crawler.clearLogsConfirm'))) {
                clearLogsMutation.mutate()
              }
            }}
          >
            {clearLogsMutation.isPending
              ? <LoaderCircle className="animate-spin" />
              : <Trash2 />}
            {t('import.crawler.clearLogs')}
          </Button>
        </div>
      </div>

      {selectedJobId !== null ? (
        jobQuery.isError || !selectedJob ? (
          <Alert variant="destructive">
            <AlertDescription>{t('import.crawler.detailsError')}</AlertDescription>
          </Alert>
        ) : (
          <JobDetails
            job={selectedJob}
            locale={i18n.language}
            isCancelling={cancelMutation.isPending && cancelMutation.variables === selectedJob.id}
            onBack={() => setSelectedJobId(null)}
            onCancel={() => cancelMutation.mutate(selectedJob.id)}
          />
        )
      ) : jobsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{t('import.crawler.listError')}</AlertDescription>
        </Alert>
      ) : jobsQuery.data?.items.length ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('import.crawler.table.status')}</TableHead>
                <TableHead>{t('import.crawler.table.category')}</TableHead>
                <TableHead>{t('import.crawler.table.created')}</TableHead>
                <TableHead className="text-right">{t('import.crawler.table.progress')}</TableHead>
                <TableHead className="text-right">{t('import.crawler.table.page')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobsQuery.data.items.map((job) => (
                <TableRow
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => setSelectedJobId(job.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedJobId(job.id)
                    }
                  }}
                >
                  <TableCell><JobStatus status={job.status} /></TableCell>
                  <TableCell className="max-w-64 truncate font-medium">
                    {job.categoryPath || job.categoryName}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDate(job.createdAt, i18n.language)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {job.progressPercent}%
                  </TableCell>
                  <TableCell className={cn(
                    'text-right tabular-nums',
                    (job.status === 'failed' || job.status === 'cancelled') && 'font-medium text-destructive',
                  )}>
                    {job.lastPage > 0 ? `${job.lastPage} / ${job.requestedPages}` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {t('import.crawler.empty')}
        </div>
      )}
    </div>
  )
}
