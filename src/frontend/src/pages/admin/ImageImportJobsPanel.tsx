import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Pause, Play, Square } from 'lucide-react'
import { useState } from 'react'
import * as productsApi from '@/features/products/api/productsApi'
import type { ImageImportJobScope, ImageImportJobStatus } from '@/features/products/types'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Progress } from '@/shared/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Separator } from '@/shared/ui/separator'

const ACTIVE: ImageImportJobStatus[] = ['Pending', 'Running', 'PauseRequested', 'Paused', 'CancelRequested']
const labels: Record<ImageImportJobStatus, string> = {
  Pending: 'Ожидание', Running: 'Загрузка', PauseRequested: 'Пауза запрошена',
  Paused: 'Приостановлено', CancelRequested: 'Отмена запрошена', Cancelled: 'Отменено',
  Completed: 'Завершено', CompletedWithErrors: 'Завершено с ошибками', Failed: 'Ошибка',
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  const units = ['КБ', 'МБ', 'ГБ', 'ТБ']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++ }
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`
}

export function ImageImportJobsPanel() {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<ImageImportJobScope>('AllMissing')
  const [parallelism, setParallelism] = useState('5')
  const [limit, setLimit] = useState('')
  const [idsText, setIdsText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const jobsQuery = useQuery({
    queryKey: ['image-import-jobs'], queryFn: ({ signal }) => productsApi.listImageImportJobs(signal), refetchInterval: 3000,
  })
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['image-import-jobs'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  ])
  const create = useMutation({
    mutationFn: productsApi.createImageImportJob,
    onSuccess: () => { setIdsText(''); setError(null); void refresh() },
    onError: (e) => setError(e instanceof Error ? e.message : 'Не удалось создать задачу.'),
  })
  const action = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'pause' | 'resume' | 'cancel' }) =>
      type === 'pause' ? productsApi.pauseImageImportJob(id)
        : type === 'resume' ? productsApi.resumeImageImportJob(id) : productsApi.cancelImageImportJob(id),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : 'Не удалось изменить задачу.'),
  })
  const jobs = jobsQuery.data ?? []
  const active = jobs.find((job) => ACTIVE.includes(job.status))

  const submit = () => {
    const p = Number(parallelism)
    const parsedLimit = limit.trim() ? Number(limit) : null
    const ids = [...new Set(idsText.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))]
    if (!Number.isInteger(p) || p < 1 || p > 10) return setError('Параллелизм должен быть от 1 до 10.')
    if (scope === 'Selected' && ids.length === 0) return setError('Укажите GUID товаров.')
    if (parsedLimit !== null && (!Number.isInteger(parsedLimit) || parsedLimit < 1)) return setError('Количество должно быть целым числом.')
    setError(null)
    create.mutate({ scope, parallelism: p, limit: scope === 'AllMissing' ? parsedLimit : null, productIds: scope === 'Selected' ? ids : null })
  }

  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Оригинальные URL сохраняются. Локальные копии загружаются в MinIO и автоматически используются в каталоге.</p>
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_120px_150px_auto] sm:items-end">
      <div className="space-y-1.5"><Label>Область загрузки</Label><Select value={scope} onValueChange={(v) => setScope(v as ImageImportJobScope)} disabled={Boolean(active)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AllMissing">Все без локального фото</SelectItem><SelectItem value="Selected">Выбранные товары</SelectItem></SelectContent></Select></div>
      <div className="space-y-1.5"><Label>Параллелизм</Label><Input type="number" min={1} max={10} value={parallelism} onChange={(e) => setParallelism(e.target.value)} disabled={Boolean(active)} /></div>
      {scope === 'AllMissing' ? <div className="space-y-1.5"><Label>Количество</Label><Input type="number" min={1} placeholder="Все" value={limit} onChange={(e) => setLimit(e.target.value)} disabled={Boolean(active)} /></div> : null}
      <Button onClick={submit} disabled={Boolean(active) || create.isPending}>{create.isPending ? <Loader2 className="animate-spin" /> : <Play />}Загрузить фото</Button>
      {scope === 'Selected' ? <div className="space-y-1.5 sm:col-span-3"><Label>GUID товаров</Label><Input value={idsText} onChange={(e) => setIdsText(e.target.value)} placeholder="GUID через пробел или запятую" disabled={Boolean(active)} /></div> : null}
    </div>
    {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
    {jobsQuery.isError ? <Alert variant="destructive"><AlertDescription>Не удалось загрузить задачи.</AlertDescription></Alert> : null}
    <Separator />
    <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-medium">История загрузок</h3>{jobsQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : null}</div>
      {jobs.map((job) => <div key={job.id} className="space-y-2 rounded-lg border p-3">
        <div className="flex justify-between text-sm font-medium"><span className="flex items-center gap-2">{job.status === 'Completed' ? <Check className="size-4 text-green-600" /> : job.status === 'Running' ? <Loader2 className="size-4 animate-spin" /> : null}{labels[job.status]}</span><span>{new Date(job.createdAt).toLocaleString('ru-RU')}</span></div>
        <div className="flex justify-between gap-3 text-sm"><span>{job.scope === 'Selected' ? 'Выбранные товары' : 'Все без локального фото'}</span><span className="whitespace-nowrap tabular-nums">{job.processedItems} / {job.totalItems} товаров · {formatBytes(job.importedBytes)} · {Math.round(job.progressPercent)}%</span></div>
        <Progress value={job.progressPercent} className="h-2" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Успешно: {job.succeededItems} · Ошибок: {job.failedItems}</span><div className="flex gap-2">{job.status === 'Running' ? <Button size="sm" variant="outline" onClick={() => action.mutate({ id: job.id, type: 'pause' })}><Pause />Пауза</Button> : null}{job.status === 'Paused' ? <Button size="sm" variant="outline" onClick={() => action.mutate({ id: job.id, type: 'resume' })}><Play />Продолжить</Button> : null}{ACTIVE.includes(job.status) ? <Button size="sm" variant="destructive" onClick={() => action.mutate({ id: job.id, type: 'cancel' })}><Square />Отменить</Button> : null}</div></div>
        {job.lastError ? <p className="text-xs text-destructive">{job.lastError}</p> : null}
      </div>)}
      {jobs.length === 0 ? <p className="text-sm text-muted-foreground">Задач пока нет.</p> : null}
    </div>
  </div>
}
