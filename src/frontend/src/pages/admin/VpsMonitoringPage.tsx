import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import * as dashboardApi from '@/features/dashboard/api/dashboardApi'
import type { VpsStats, VpsStatsField } from '@/features/dashboard/types'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

const FALLBACK_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea']

const WINDOWS = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const

type WindowKey = keyof typeof WINDOWS
type ChartRow = { timestamp: number } & Record<string, number>

const FIELDS: Array<{ field: VpsStatsField; fullWidth?: boolean }> = [
  { field: 'cpu' },
  { field: 'memory' },
  { field: 'disk' },
  { field: 'io' },
  { field: 'traffic', fullWidth: true },
]

function formatValue(value: number, field: VpsStatsField, locale: string) {
  if (!Number.isFinite(value)) return '—'
  if (field === 'cpu') {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`
  }

  const suffix = field === 'io' || field === 'traffic' ? '/с' : ''
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  let normalized = Math.abs(value)
  let unit = 0
  while (normalized >= 1000 && unit < units.length - 1) {
    normalized /= 1000
    unit += 1
  }
  const signed = value < 0 ? -normalized : normalized
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(signed)} ${units[unit]}${suffix}`
}

function formatAxisDate(timestamp: number, locale: string, duration: number) {
  return new Intl.DateTimeFormat(locale, duration <= WINDOWS['24h']
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit' }).format(new Date(timestamp))
}

function safeColor(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback
}

function prepareChart(data: VpsStats) {
  const rows = new Map<number, ChartRow>()
  const config: ChartConfig = {}
  data.series.forEach((series, index) => {
    const key = `series${index}`
    config[key] = {
      label: series.name,
      color: safeColor(series.color, FALLBACK_COLORS[index % FALLBACK_COLORS.length]),
    }
    for (const point of series.data) {
      const row = rows.get(point.timestamp) ?? { timestamp: point.timestamp }
      row[key] = point.value
      rows.set(point.timestamp, row)
    }
  })
  return {
    rows: [...rows.values()].sort((left, right) => left.timestamp - right.timestamp),
    config,
  }
}

function VpsLineChart({
  data,
  field,
  locale,
  duration,
  onShift,
}: {
  data: VpsStats
  field: VpsStatsField
  locale: string
  duration: number
  onShift: (direction: -1 | 1) => void
}) {
  const dragStart = useRef<number | null>(null)
  const prepared = useMemo(() => prepareChart(data), [data])

  if (prepared.rows.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Нет данных за выбранный период
      </div>
    )
  }

  return (
    <div
      className="cursor-ew-resize touch-pan-y select-none"
      onPointerDown={(event) => {
        dragStart.current = event.clientX
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={(event) => {
        const start = dragStart.current
        dragStart.current = null
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
        if (start == null) return
        const distance = event.clientX - start
        if (Math.abs(distance) >= 45) onShift(distance > 0 ? -1 : 1)
      }}
      onPointerCancel={() => { dragStart.current = null }}
    >
      <ChartContainer config={prepared.config} className="h-72 w-full aspect-auto">
        <LineChart accessibilityLayer data={prepared.rows} margin={{ left: 8, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tickFormatter={(value) => formatAxisDate(Number(value), locale, duration)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(value) => formatValue(Number(value), field, locale)}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={(
              <ChartTooltipContent
                labelFormatter={(_value, payload) => {
                  const timestamp = Number(payload?.[0]?.payload?.timestamp)
                  return Number.isFinite(timestamp)
                    ? new Intl.DateTimeFormat(locale, {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      }).format(new Date(timestamp))
                    : ''
                }}
                formatter={(value, name, item) => (
                  <div className="flex w-full items-center justify-between gap-5">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {prepared.config[String(name)]?.label ?? String(name)}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatValue(Number(value), field, locale)}
                    </span>
                  </div>
                )}
              />
            )}
          />
          <ChartLegend content={<ChartLegendContent />} />
          {data.series.map((series, index) => {
            const key = `series${index}`
            return (
              <Line
                key={`${series.name}-${index}`}
                dataKey={key}
                type={series.type === 'areaspline' ? 'monotone' : 'linear'}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )
          })}
        </LineChart>
      </ChartContainer>
    </div>
  )
}

function MetricChart({
  field,
  start,
  end,
  duration,
  locale,
  fullWidth,
  onShift,
}: {
  field: VpsStatsField
  start: string
  end: string
  duration: number
  locale: string
  fullWidth?: boolean
  onShift: (direction: -1 | 1) => void
}) {
  const { t } = useTranslation('dashboard')
  const query = useQuery({
    queryKey: ['vps-stats', field, start, end],
    queryFn: ({ signal }) => dashboardApi.getVpsStats(field, start, end, signal),
    staleTime: 30_000,
  })

  return (
    <Card className={cn(fullWidth && 'lg:col-span-2')}>
      <CardHeader className="border-b pb-3">
        <CardTitle>{t(`monitoring.fields.${field}`)}</CardTitle>
        {query.data?.subtitle ? <p className="text-xs text-muted-foreground">{query.data.subtitle}</p> : null}
      </CardHeader>
      <CardContent className="pt-3">
        {query.isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <LoaderCircle className="animate-spin text-muted-foreground" />
          </div>
        ) : query.isError ? (
          <Alert variant="destructive"><AlertDescription>{t('monitoring.loadError')}</AlertDescription></Alert>
        ) : query.data ? (
          <VpsLineChart
            data={query.data}
            field={field}
            locale={locale}
            duration={duration}
            onShift={onShift}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

export function VpsMonitoringPage() {
  const { t, i18n } = useTranslation('dashboard')
  const navigate = useNavigate()
  const [windowKey, setWindowKey] = useState<WindowKey>('6h')
  const [endMs, setEndMs] = useState(() => Date.now())
  const [anchoredToNow, setAnchoredToNow] = useState(true)
  const duration = WINDOWS[windowKey]
  const start = new Date(endMs - duration).toISOString()
  const end = new Date(endMs).toISOString()

  useEffect(() => {
    if (!anchoredToNow) return
    const timer = window.setInterval(() => setEndMs(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [anchoredToNow])

  const shift = (direction: -1 | 1) => {
    const now = Date.now()
    setEndMs((current) => {
      const next = current + duration * direction
      if (next >= now) {
        setAnchoredToNow(true)
        return now
      }
      setAnchoredToNow(false)
      return next
    })
  }

  const resetToNow = () => {
    setAnchoredToNow(true)
    setEndMs(Date.now())
  }

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-start gap-3">
        <Button type="button" variant="ghost" size="icon" aria-label={t('monitoring.back')} onClick={() => navigate('/admin')}>
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('monitoring.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('monitoring.description')}</p>
        </div>
      </div>

      <div className="sticky top-[61px] z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" aria-label={t('monitoring.previous')} onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={t('monitoring.next')} disabled={anchoredToNow} onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={anchoredToNow} onClick={resetToNow}>
            <RefreshCw />{t('monitoring.now')}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground tabular-nums sm:text-sm">
          {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(start))}
          {' — '}
          {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(end))}
        </p>

        <Select
          value={windowKey}
          onValueChange={(value) => {
            setWindowKey(value as WindowKey)
            if (anchoredToNow) setEndMs(Date.now())
          }}
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent align="end">
            {(Object.keys(WINDOWS) as WindowKey[]).map((key) => (
              <SelectItem key={key} value={key}>{t(`monitoring.windows.${key}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{t('monitoring.dragHint')}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        {FIELDS.map(({ field, fullWidth }) => (
          <MetricChart
            key={field}
            field={field}
            start={start}
            end={end}
            duration={duration}
            locale={i18n.language}
            fullWidth={fullWidth}
            onShift={shift}
          />
        ))}
      </div>
    </div>
  )
}
