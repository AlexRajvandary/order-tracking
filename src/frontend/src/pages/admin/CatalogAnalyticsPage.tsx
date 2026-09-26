import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleOff,
  Image,
  Layers3,
  PackageCheck,
  Palette,
  RefreshCw,
  Ruler,
  Tags,
  Text,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import * as productsApi from '@/features/products/api/productsApi'
import type { CategoryAnalytics } from '@/features/products/types'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/ui/chart'
import { Progress } from '@/shared/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { cn } from '@/shared/lib/utils'

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100)
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone = 'default',
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  tone?: 'default' | 'success' | 'warning'
}) {
  return (
    <Card className="gap-3">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl [&>svg]:size-5',
          tone === 'success' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          tone === 'warning' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
          tone === 'default' && 'bg-muted text-muted-foreground',
        )}>
          {icon}
        </span>
      </CardContent>
    </Card>
  )
}

function CompletenessMetric({
  icon,
  label,
  hint,
  count,
  total,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  count: number
  total: number
}) {
  const value = percent(count, total)
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground [&>svg]:size-4">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium">{label}</p>
            <p className="font-semibold tabular-nums">{value}%</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          <Progress value={value} className="mt-3 h-1.5" />
          <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
            {count.toLocaleString()} / {total.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

function BreakdownList({
  items,
  total,
  label,
}: {
  items: Array<{ key: string; count: number }>
  total: number
  label: (key: string) => string
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const value = percent(item.count, total)
        return (
          <div key={item.key}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{label(item.key)}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {item.count.toLocaleString()} <span className="text-xs text-muted-foreground">· {value}%</span>
              </span>
            </div>
            <Progress value={value} className="h-1.5" />
          </div>
        )
      })}
    </div>
  )
}

function PercentageCell({ value, total }: { value: number; total: number }) {
  const result = percent(value, total)
  return (
    <span className={cn(
      'font-medium tabular-nums',
      result >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
        result < 50 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
    )}>
      {result}%
    </span>
  )
}

function CategoryQualityTable({
  categories,
}: {
  categories: CategoryAnalytics[]
}) {
  const { t } = useTranslation('catalogAnalytics')
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('categories.category')}</TableHead>
          <TableHead className="text-right">{t('categories.products')}</TableHead>
          <TableHead className="text-right">{t('categories.active')}</TableHead>
          <TableHead className="text-right">{t('categories.descriptionColumn')}</TableHead>
          <TableHead className="text-right">{t('categories.photos')}</TableHead>
          <TableHead className="text-right">{t('categories.colors')}</TableHead>
          <TableHead className="text-right">{t('categories.sizes')}</TableHead>
          <TableHead className="text-right">{t('categories.complete')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.categoryId ?? 'uncategorized'}>
            <TableCell className="max-w-64 font-medium">
              <span className="block truncate">
                {category.isUncategorized ? t('categories.uncategorized') : category.name}
              </span>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">{category.productCount.toLocaleString()}</TableCell>
            <TableCell className="text-right"><PercentageCell value={category.activeCount} total={category.productCount} /></TableCell>
            <TableCell className="text-right"><PercentageCell value={category.detailedDescriptionCount} total={category.productCount} /></TableCell>
            <TableCell className="text-right"><PercentageCell value={category.additionalImagesCount} total={category.productCount} /></TableCell>
            <TableCell className="text-right"><PercentageCell value={category.colorsCount} total={category.productCount} /></TableCell>
            <TableCell className="text-right"><PercentageCell value={category.sizesCount} total={category.productCount} /></TableCell>
            <TableCell className="text-right"><PercentageCell value={category.fullyEnrichedCount} total={category.productCount} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function CatalogAnalyticsPage() {
  const { t, i18n } = useTranslation('catalogAnalytics')
  const query = useQuery({
    queryKey: ['catalog-analytics'],
    queryFn: ({ signal }) => productsApi.getCatalogAnalytics(signal),
  })

  const categoryChartConfig = useMemo(() => ({
    count: { label: t('categories.products'), color: 'var(--chart-2)' },
  }) satisfies ChartConfig, [t])
  const additionsChartConfig = useMemo(() => ({
    count: { label: t('categories.products'), color: 'var(--chart-3)' },
  }) satisfies ChartConfig, [t])

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{t('error', { ns: 'common' })}</span>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {t('retry', { ns: 'common' })}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const data = query.data
  const total = data.summary.total
  const count = (value: number) => new Intl.NumberFormat(i18n.language).format(value)
  const dateTime = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(data.generatedAt))
  const categoryChartData = data.categories.slice(0, 10).map((category) => ({
    name: category.isUncategorized ? t('categories.uncategorized') : category.name ?? '—',
    count: category.productCount,
  }))
  const additionsChartData = data.recentAdditions.map((item) => ({
    date: new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' })
      .format(new Date(`${item.date}T00:00:00`)),
    count: item.count,
  }))
  const completeness = [
    { icon: <Text />, label: t('completeness.detailedDescription'), hint: t('completeness.detailedDescriptionHint', { count: data.completeness.detailedDescriptionMinLength }), count: data.completeness.detailedDescription },
    { icon: <Image />, label: t('completeness.additionalImages'), hint: t('completeness.additionalImagesHint'), count: data.completeness.additionalImages },
    { icon: <Palette />, label: t('completeness.colors'), hint: t('completeness.colorsHint'), count: data.completeness.colors },
    { icon: <Ruler />, label: t('completeness.sizes'), hint: t('completeness.sizesHint'), count: data.completeness.sizes },
    { icon: <Layers3 />, label: t('completeness.sizeSpecifications'), hint: t('completeness.sizeSpecificationsHint'), count: data.completeness.sizeSpecifications },
    { icon: <PackageCheck />, label: t('completeness.localImage'), hint: t('completeness.localImageHint'), count: data.completeness.localImage },
    { icon: <Tags />, label: t('completeness.material'), hint: t('completeness.materialHint'), count: data.completeness.material },
  ]
  const attention = [
    { label: t('attention.notFullyEnriched'), value: data.attention.notFullyEnriched },
    { label: t('attention.missingDescription'), value: data.attention.missingDetailedDescription },
    { label: t('attention.missingImages'), value: data.attention.missingAdditionalImages },
    { label: t('attention.missingCategory'), value: data.summary.uncategorized },
    { label: t('attention.missingOptions'), value: data.attention.missingOptions },
    { label: t('attention.missingSpecs'), value: data.attention.missingSizeSpecifications },
    { label: t('attention.missingLocalImage'), value: data.attention.missingLocalImage },
  ].sort((left, right) => right.value - left.value)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('updated', { date: dateTime })}</p>
        </div>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={cn(query.isFetching && 'animate-spin')} />
          {t('refresh')}
        </Button>
      </div>

      {total === 0 ? (
        <Alert><AlertDescription>{t('noData')}</AlertDescription></Alert>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={<Boxes />} label={t('summary.total')} value={count(total)} detail={`${count(data.summary.active)} / ${count(data.summary.inactive)}`} />
            <SummaryCard icon={<CheckCircle2 />} label={t('summary.active')} value={`${percent(data.summary.active, total)}%`} detail={t('ofTotal', { count: count(data.summary.active), total: count(total) })} tone="success" />
            <SummaryCard icon={<PackageCheck />} label={t('summary.fullyEnriched')} value={`${percent(data.summary.fullyEnriched, total)}%`} detail={t('ofTotal', { count: count(data.summary.fullyEnriched), total: count(total) })} tone="success" />
            <SummaryCard icon={<CircleOff />} label={t('summary.uncategorized')} value={count(data.summary.uncategorized)} detail={`${percent(data.summary.uncategorized, total)}%`} tone={data.summary.uncategorized > 0 ? 'warning' : 'default'} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>{t('completeness.title')}</CardTitle>
              <CardDescription>{t('completeness.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {completeness.map((metric) => <CompletenessMetric key={metric.label} {...metric} total={total} />)}
            </CardContent>
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('charts.categories')}</CardTitle>
                <CardDescription>{t('charts.categoriesDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={categoryChartConfig} className="h-72 w-full aspect-auto">
                  <BarChart data={categoryChartData} margin={{ left: 4, right: 4, top: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tickFormatter={(value: string) => value.length > 12 ? `${value.slice(0, 12)}…` : value} />
                    <YAxis tickLine={false} axisLine={false} width={38} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('charts.recent')}</CardTitle>
                <CardDescription>{t('charts.recentDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={additionsChartConfig} className="h-72 w-full aspect-auto">
                  <AreaChart data={additionsChartData} margin={{ left: 4, right: 4, top: 8 }}>
                    <defs>
                      <linearGradient id="catalog-additions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis tickLine={false} axisLine={false} width={38} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area dataKey="count" type="monotone" fill="url(#catalog-additions)" stroke="var(--color-count)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('attention.title')}</CardTitle>
                <CardDescription>{t('attention.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {attention.map((item, index) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      {index === 0 ? <AlertTriangle className="size-4 shrink-0 text-amber-500" /> : null}
                      <span className="truncate">{item.label}</span>
                    </span>
                    <Badge variant={item.value > 0 ? 'outline' : 'secondary'}>{count(item.value)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('charts.availability')}</CardTitle>
                <CardDescription>{t('charts.availabilityDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownList items={data.availability} total={total} label={(key) => t(`availability.${key}`)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('charts.imageDepth')}</CardTitle>
                <CardDescription>{t('charts.imageDepthDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownList items={data.imageDepth} total={total} label={(key) => t(`imageDepth.${key}`)} />
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>{t('categories.title')}</CardTitle>
              <CardDescription>{t('categories.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryQualityTable categories={data.categories} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('leaders.title')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {[
                { title: t('leaders.brands'), items: data.topBrands },
                { title: t('leaders.shops'), items: data.topShops },
              ].map((section) => (
                <div key={section.title}>
                  <h3 className="mb-3 text-sm font-medium">{section.title}</h3>
                  {section.items.length === 0 ? <p className="text-sm text-muted-foreground">{t('leaders.empty')}</p> : (
                    <div className="space-y-2">
                      {section.items.map((item, index) => (
                        <div key={item.key} className="flex items-center gap-3 text-sm">
                          <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                          <span className="min-w-0 flex-1 truncate">{item.key}</span>
                          <span className="font-medium tabular-nums">{count(item.count)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
