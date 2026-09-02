import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Pause, Play, Square } from 'lucide-react'
import { useState } from 'react'
import * as productsApi from '@/features/products/api/productsApi'
import type { TranslationJobScope, TranslationJobStatus } from '@/features/products/types'
import { Alert, AlertDescription } from '@/shared/ui/alert'
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
import { Separator } from '@/shared/ui/separator'

const ACTIVE_STATUSES: TranslationJobStatus[] = [
  'Pending',
  'Running',
  'PauseRequested',
  'Paused',
  'CancelRequested',
]

function statusLabel(status: TranslationJobStatus) {
  return {
    Pending: 'Ожидание',
    Running: 'Выполняется',
    PauseRequested: 'Пауза запрошена',
    Paused: 'Приостановлено',
    CancelRequested: 'Отмена запрошена',
    Cancelled: 'Отменено',
    Completed: 'Завершено',
    CompletedWithErrors: 'Завершено с ошибками',
    Failed: 'Ошибка',
  }[status]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function TranslationJobsPanel() {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<TranslationJobScope>('AllUntranslated')
  const [parallelism, setParallelism] = useState('5')
  const [limit, setLimit] = useState('')
  const [productIdsText, setProductIdsText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const jobsQuery = useQuery({
    queryKey: ['translation-jobs'],
    queryFn: ({ signal }) => productsApi.listTranslationJobs(signal),
    refetchInterval: 3000,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['translation-jobs'] })
  const createMutation = useMutation({
    mutationFn: productsApi.createTranslationJob,
    onSuccess: () => {
      setProductIdsText('')
      setError(null)
      void refresh()
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : 'Не удалось создать задание.'),
  })

  const actionMutation = useMutation({
    mutationFn: ({ action, id }: { action: 'pause' | 'resume' | 'cancel'; id: string }) => {
      if (action === 'pause') return productsApi.pauseTranslationJob(id)
      if (action === 'resume') return productsApi.resumeTranslationJob(id)
      return productsApi.cancelTranslationJob(id)
    },
    onSuccess: refresh,
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : 'Не удалось изменить задание.'),
  })

  const jobs = jobsQuery.data ?? []
  const activeJob = jobs.find((job) => ACTIVE_STATUSES.includes(job.status))
  const submit = () => {
    const productIds = productIdsText
      .split(/[\s,;]+/)
      .map((id) => id.trim())
      .filter(Boolean)
    const value = Number(parallelism)
    if (!Number.isInteger(value) || value < 1) {
      setError('Параллелизм должен быть целым числом не меньше 1.')
      return
    }
    if (scope === 'Selected' && productIds.length === 0) {
      setError('Укажите хотя бы один GUID товара.')
      return
    }
    const parsedLimit = limit.trim() === '' ? null : Number(limit)
    if (parsedLimit !== null && (!Number.isInteger(parsedLimit) || parsedLimit < 1)) {
      setError('Ограничение количества товаров должно быть целым числом не меньше 1.')
      return
    }
    setError(null)
    createMutation.mutate({
      scope,
      parallelism: value,
      productIds: scope === 'Selected' ? [...new Set(productIds)] : null,
      limit: scope === 'AllUntranslated' ? parsedLimit : null,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Перевод названий выполняется отдельным worker через OpenAI. Прогресс обновляется автоматически.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_120px_150px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label>Область перевода</Label>
          <Select value={scope} onValueChange={(value) => setScope(value as TranslationJobScope)} disabled={Boolean(activeJob)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AllUntranslated">Все без русского названия</SelectItem>
              <SelectItem value="Selected">Выбранные товары</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="translation-parallelism">Параллелизм</Label>
          <Input id="translation-parallelism" type="number" min={1} max={10} value={parallelism} onChange={(event) => setParallelism(event.target.value)} disabled={Boolean(activeJob)} />
        </div>
        {scope === 'AllUntranslated' ? (
          <div className="space-y-1.5">
            <Label htmlFor="translation-limit">Количество товаров</Label>
            <Input id="translation-limit" type="number" min={1} placeholder="Все" value={limit} onChange={(event) => setLimit(event.target.value)} disabled={Boolean(activeJob)} />
          </div>
        ) : null}
        <Button onClick={submit} disabled={Boolean(activeJob) || createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="animate-spin" /> : <Play />}
          Запустить перевод
        </Button>
        {scope === 'Selected' ? (
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="translation-product-ids">GUID товаров</Label>
            <Input id="translation-product-ids" value={productIdsText} onChange={(event) => setProductIdsText(event.target.value)} placeholder="GUID через пробел или запятую" disabled={Boolean(activeJob)} />
          </div>
        ) : null}
      </div>

      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {jobsQuery.isError ? <Alert variant="destructive"><AlertDescription>Не удалось загрузить задания перевода.</AlertDescription></Alert> : null}

      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">История заданий</h3>
          {jobsQuery.isFetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
        {jobs.length === 0 ? <p className="text-sm text-muted-foreground">Заданий пока нет.</p> : null}
        {jobs.map((job) => {
          const progress = Math.max(0, Math.min(100, job.progressPercent ?? (job.totalItems ? (job.processedItems / job.totalItems) * 100 : 0)))
          const isActionPending = actionMutation.isPending && actionMutation.variables?.id === job.id
          return (
            <div key={job.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {job.status === 'Completed' ? <Check className="size-4 text-green-600" /> : job.status === 'Running' ? <Loader2 className="size-4 animate-spin" /> : null}
                  {statusLabel(job.status)}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{job.scope === 'Selected' ? 'Выбранные товары' : 'Все без перевода'}</span>
                <span className="tabular-nums">{job.processedItems} / {job.totalItems} · {Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Успешно: {job.succeededItems} · Ошибок: {job.failedItems} · Модель: {job.model}</span>
                <div className="flex gap-2">
                  {job.status === 'Running' ? <Button size="sm" variant="outline" disabled={isActionPending} onClick={() => actionMutation.mutate({ action: 'pause', id: job.id })}><Pause />Пауза</Button> : null}
                  {job.status === 'Paused' ? <Button size="sm" variant="outline" disabled={isActionPending} onClick={() => actionMutation.mutate({ action: 'resume', id: job.id })}><Play />Продолжить</Button> : null}
                  {ACTIVE_STATUSES.includes(job.status) ? <Button size="sm" variant="destructive" disabled={isActionPending} onClick={() => actionMutation.mutate({ action: 'cancel', id: job.id })}><Square />Отменить</Button> : null}
                </div>
              </div>
              {job.lastError ? <p className="text-xs text-destructive">{job.lastError}</p> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
