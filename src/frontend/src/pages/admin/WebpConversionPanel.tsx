import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Play, Square } from 'lucide-react'
import * as productsApi from '@/features/products/api/productsApi'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/progress'
import { Separator } from '@/shared/ui/separator'

const active = ['Pending', 'Scanning', 'Running']
const labels: Record<productsApi.WebpConversionStatus['status'], string> = {
  Pending: 'Ожидание', Scanning: 'Подсчёт изображений', Running: 'Конвертация',
  Completed: 'Завершено', CompletedWithErrors: 'Завершено с ошибками',
  Cancelled: 'Отменено', Failed: 'Ошибка',
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  const units = ['КБ', 'МБ', 'ГБ', 'ТБ']
  let value = bytes / 1024
  let index = 0
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index++ }
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)} ${units[index]}`
}

export function WebpConversionPanel() {
  const queryClient = useQueryClient()
  const statusQuery = useQuery({
    queryKey: ['webp-conversion'],
    queryFn: ({ signal }) => productsApi.getWebpConversionStatus(signal),
    refetchInterval: 2000,
  })
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['webp-conversion'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  ])
  const start = useMutation({ mutationFn: productsApi.startWebpConversion, onSuccess: refresh })
  const cancel = useMutation({ mutationFn: productsApi.cancelWebpConversion, onSuccess: refresh })
  const job = statusQuery.data
  const running = job && active.includes(job.status)
  const progress = job && job.total > 0 ? Math.round(job.processed / job.total * 100) : 0
  const error = start.error ?? cancel.error

  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Локальные JPG и PNG из MinIO конвертируются в WebP по одному. После проверки нового файла ссылки обновляются в базе, затем оригинал удаляется. Уже готовые WebP пропускаются.</p>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div><p className="font-medium">Конвертация изображений</p><p className="text-xs text-muted-foreground">Задача продолжает работать после закрытия окна.</p></div>
      <Button onClick={() => start.mutate()} disabled={Boolean(running) || start.isPending}>{start.isPending ? <Loader2 className="animate-spin" /> : <Play />}Начать конвертацию</Button>
    </div>
    {error ? <Alert variant="destructive"><AlertDescription>{error instanceof Error ? error.message : 'Не удалось выполнить действие.'}</AlertDescription></Alert> : null}
    {statusQuery.isError ? <Alert variant="destructive"><AlertDescription>Не удалось получить состояние задачи.</AlertDescription></Alert> : null}
    <Separator />
    {job ? <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3 text-sm font-medium"><span className="flex items-center gap-2">{running ? <Loader2 className="size-4 animate-spin" /> : job.status === 'Completed' ? <Check className="size-4 text-green-600" /> : null}{labels[job.status]}</span><span>{new Date(job.startedAt).toLocaleString('ru-RU')}</span></div>
      <div className="flex justify-between gap-3 text-sm"><span>Обработано изображений</span><span className="tabular-nums">{job.processed} / {job.total} · {progress}%</span></div>
      <Progress value={progress} className="h-2" />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Конвертировано: {job.converted} · Пропущено: {job.skipped} · Ошибок: {job.failed}</span>{running ? <Button size="sm" variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}><Square />Отменить</Button> : null}</div>
      {job.originalBytes > 0 ? <p className="text-xs text-muted-foreground">Объём конвертированных: {formatBytes(job.originalBytes)} → {formatBytes(job.webpBytes)} · экономия {formatBytes(Math.max(0, job.originalBytes - job.webpBytes))}</p> : null}
      {job.lastError ? <p className="text-xs text-destructive">Последняя ошибка: {job.lastError}</p> : null}
    </div> : <p className="text-sm text-muted-foreground">Задача ещё не запускалась.</p>}
  </div>
}
