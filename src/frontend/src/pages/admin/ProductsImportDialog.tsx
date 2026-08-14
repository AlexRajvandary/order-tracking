import { ExternalLink, FileCode2, FileJson, ImageOff, ListTodo, Upload } from 'lucide-react'
import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as productsApi from '@/features/products/api/productsApi'
import {
  HTML_PRODUCT_PARSERS,
  parseProductsHtml,
  type HtmlProductParserId,
} from '@/features/products/lib/htmlProductParsers'
import type {
  Category,
  ImportProductIssue,
  ImportProductItem,
  ImportProductsResult,
} from '@/features/products/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/shared/ui/carousel'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Progress } from '@/shared/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Textarea } from '@/shared/ui/textarea'
import { CrawlerJobsPanel } from './CrawlerJobsPanel'

const IMPORT_BATCH_SIZE = 100
const CATEGORY_FROM_SOURCE = '__category_from_source__'
const CATEGORY_NEW = '__category_new__'
const CATEGORY_ROOT = '__category_root__'
const EXAMPLE_JSON = `[
  {
    "name": "Example product",
    "price": 12990,
    "currencyCode": "RUB",
    "imageUrl": "https://example.com/product.jpg",
    "sourceUrl": "https://example.com/product",
    "sku": "EXAMPLE-001",
    "brand": "Example brand",
    "categoryName": "Crossbody bags",
    "parentCategoryName": "Bags",
    "condition": "new",
    "isActive": true
  }
]`

type ImportSummary = Omit<ImportProductsResult, 'total' | 'issues'> & {
  total: number
  issues: ImportProductIssue[]
}

type ImportSource = 'json' | 'html' | 'crawler'

type CategoryOption = {
  id: string
  label: string
}

const emptySummary = (): ImportSummary => ({
  total: 0,
  insertedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  categoriesCreatedCount: 0,
  brandsCreatedCount: 0,
  shopsCreatedCount: 0,
  issues: [],
})

function parseProducts(json: string): ImportProductItem[] {
  const parsed: unknown = JSON.parse(json)
  const products = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { products?: unknown }).products)
      ? (parsed as { products: unknown[] }).products
      : null

  if (!products) throw new Error('root')
  if (products.length === 0) throw new Error('empty')
  if (products.some((item) => item == null || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('items')
  }
  return products as ImportProductItem[]
}

function flattenCategoryOptions(
  categories: Category[],
  depth = 0,
): CategoryOption[] {
  return categories.flatMap((category) => [
    {
      id: category.id,
      label: `${depth > 0 ? `${'— '.repeat(depth)}` : ''}${category.name}`,
    },
    ...flattenCategoryOptions(category.children, depth + 1),
  ])
}

function assignCategory(
  product: ImportProductItem,
  selection: string,
  newCategoryName: string,
  newCategoryParentId: string,
): ImportProductItem {
  if (selection === CATEGORY_FROM_SOURCE) return product

  const categoryFields = {
    categories: null,
    category: null,
    categorySlug: null,
    parentCategoryId: null,
    parentCategory: null,
    parentCategoryName: null,
    parentCategorySlug: null,
  }

  if (selection === CATEGORY_NEW) {
    return {
      ...product,
      ...categoryFields,
      categoryId: null,
      categoryName: newCategoryName.trim(),
      parentCategoryId:
        newCategoryParentId === CATEGORY_ROOT ? null : newCategoryParentId,
    }
  }

  return {
    ...product,
    ...categoryFields,
    categoryId: selection,
    categoryName: null,
  }
}

function markUsedFromName(product: ImportProductItem): ImportProductItem {
  if (typeof product.name !== 'string') return product
  return /(^|[^\p{L}\p{N}])б\s*(?:\/|-)\s*у(?![\p{L}\p{N}])/iu.test(product.name)
    ? { ...product, condition: 'used' }
    : product
}

function mergeSummary(
  current: ImportSummary,
  batch: ImportProductsResult,
  offset: number,
): ImportSummary {
  return {
    total: current.total + batch.total,
    insertedCount: current.insertedCount + batch.insertedCount,
    skippedCount: current.skippedCount + batch.skippedCount,
    failedCount: current.failedCount + batch.failedCount,
    categoriesCreatedCount:
      current.categoriesCreatedCount + batch.categoriesCreatedCount,
    brandsCreatedCount: current.brandsCreatedCount + batch.brandsCreatedCount,
    shopsCreatedCount: current.shopsCreatedCount + batch.shopsCreatedCount,
    issues: [
      ...current.issues,
      ...batch.issues.map((issue) => ({ ...issue, index: issue.index + offset })),
    ],
  }
}

function formatPreviewPrice(product: ImportProductItem, locale: string) {
  if (typeof product.price !== 'number' || !Number.isFinite(product.price)) return null

  const currency = typeof product.currencyCode === 'string'
    ? product.currencyCode.trim().toUpperCase()
    : 'RUB'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'RUB',
      maximumFractionDigits: 2,
    }).format(product.price)
  } catch {
    return `${product.price} ${currency || 'RUB'}`
  }
}

export function ProductsImportDialog({
  open,
  onOpenChange,
  onImported,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => Promise<void> | void
  categories: Category[]
}) {
  const { t, i18n } = useTranslation('products')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<ImportSource>('json')
  const [input, setInput] = useState('')
  const [htmlParser, setHtmlParser] = useState<HtmlProductParserId>('zenplus')
  const [fileName, setFileName] = useState<string | null>(null)
  const [categorySelection, setCategorySelection] = useState(CATEGORY_FROM_SOURCE)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryParentId, setNewCategoryParentId] = useState(CATEGORY_ROOT)
  const [createMissingCategories, setCreateMissingCategories] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notificationError, setNotificationError] = useState<string | null>(null)

  const parsedProducts = useMemo(() => {
    if (!input.trim()) return null
    try {
      return source === 'json'
        ? parseProducts(input)
        : parseProductsHtml(htmlParser, input)
    } catch {
      return null
    }
  }, [htmlParser, input, source])
  const categoryOptions = useMemo(
    () => flattenCategoryOptions(categories),
    [categories],
  )

  const resetResult = () => {
    setProcessed(0)
    setTotal(0)
    setSummary(null)
    setError(null)
    setNotificationError(null)
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setInput(await file.text())
      setFileName(file.name)
      resetResult()
    } catch {
      setError(t('import.fileReadError'))
    } finally {
      event.target.value = ''
    }
  }

  const startImport = async () => {
    let products: ImportProductItem[]
    try {
      products = source === 'json'
        ? parseProducts(input)
        : parseProductsHtml(htmlParser, input)
    } catch (parseError) {
      const reason = parseError instanceof Error ? parseError.message : ''
      setError(t(`import.parseErrors.${reason || (source === 'json' ? 'json' : 'htmlNoProducts')}`))
      return
    }

    if (categorySelection === CATEGORY_NEW && !newCategoryName.trim()) {
      setError(t('import.categoryNameRequired'))
      return
    }

    products = products.map((product) =>
      markUsedFromName(assignCategory(
          product,
          categorySelection,
          newCategoryName,
          newCategoryParentId,
        ),
      ),
    )

    setIsImporting(true)
    setError(null)
    setNotificationError(null)
    setProcessed(0)
    setTotal(products.length)
    let nextSummary = emptySummary()
    const importId = crypto.randomUUID()

    try {
      for (let offset = 0; offset < products.length; offset += IMPORT_BATCH_SIZE) {
        const batch = products.slice(offset, offset + IMPORT_BATCH_SIZE)
        const result = await productsApi.importProducts({
          products: batch,
          createMissingCategories:
            categorySelection === CATEGORY_NEW || createMissingCategories,
        })
        nextSummary = mergeSummary(nextSummary, result, offset)
        setSummary(nextSummary)
        setProcessed(Math.min(offset + batch.length, products.length))
      }
      if (nextSummary.insertedCount > 0) {
        try {
          await productsApi.notifyProductImport({
            importId,
            insertedCount: nextSummary.insertedCount,
          })
        } catch {
          setNotificationError(t('import.notificationError'))
        }
      }
      await onImported()
    } catch (importError) {
      setError(importError instanceof ApiError ? importError.message : t('import.requestError'))
    } finally {
      setIsImporting(false)
    }
  }

  const progress = total > 0 ? Math.round((processed / total) * 100) : 0
  const finished = total > 0 && processed === total && !isImporting

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isImporting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[94vh] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <Tabs
            value={source}
            onValueChange={(value) => {
              setSource(value as ImportSource)
              setInput('')
              setFileName(null)
              resetResult()
            }}
          >
            <TabsList>
              <TabsTrigger value="json" disabled={isImporting}>
                <FileJson />{t('import.sources.json')}
              </TabsTrigger>
              <TabsTrigger value="html" disabled={isImporting}>
                <FileCode2 />{t('import.sources.html')}
              </TabsTrigger>
              <TabsTrigger value="crawler" disabled={isImporting}>
                <ListTodo />{t('import.sources.crawler')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {source === 'crawler' ? (
            <CrawlerJobsPanel categories={categories} />
          ) : <>
          <p className="text-sm text-muted-foreground">
            {t(source === 'json' ? 'import.description' : 'import.htmlDescription')}
          </p>

          {source === 'html' ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t('import.parserLabel')}</p>
              <Select
                value={htmlParser}
                disabled={isImporting}
                onValueChange={(value) => {
                  setHtmlParser(value as HtmlProductParserId)
                  resetResult()
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTML_PRODUCT_PARSERS.map((parser) => (
                    <SelectItem key={parser.id} value={parser.id}>
                      {t(`import.parsers.${parser.id}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t(`import.parserHints.${htmlParser}`)}
              </p>
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept={source === 'json' ? 'application/json,.json' : 'text/html,.html,.htm,.txt'}
            className="hidden"
            onChange={(event) => void handleFile(event)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              {source === 'json' ? <FileJson /> : <FileCode2 />}
              {t(source === 'json' ? 'import.chooseFile' : 'import.chooseHtmlFile')}
            </Button>
            {fileName ? (
              <span className="max-w-full truncate text-sm text-muted-foreground">
                {fileName}
              </span>
            ) : null}
            {source === 'json' ? <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isImporting}
              onClick={() => {
                setInput(EXAMPLE_JSON)
                setFileName(null)
                resetResult()
              }}
            >
              {t('import.showExample')}
            </Button> : null}
          </div>

          <Textarea
            value={input}
            disabled={isImporting}
            wrap="off"
            className="h-64 min-h-64 max-h-64 min-w-0 max-w-full resize-none overflow-auto whitespace-pre [field-sizing:fixed] font-mono text-xs"
            placeholder={t(source === 'json' ? 'import.placeholder' : 'import.htmlPlaceholder')}
            spellCheck={false}
            onChange={(event) => {
              setInput(event.target.value)
              setFileName(null)
              resetResult()
            }}
          />

          <div className="space-y-2 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t('import.categoryLabel')}</p>
              <p className="text-xs text-muted-foreground">
                {t('import.categoryHint')}
              </p>
            </div>
            <Select
              value={categorySelection}
              disabled={isImporting}
              onValueChange={(value) => {
                setCategorySelection(value)
                if (value === CATEGORY_NEW) setCreateMissingCategories(true)
                resetResult()
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CATEGORY_FROM_SOURCE}>
                  {t('import.categoryFromSource')}
                </SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
                <SelectItem value={CATEGORY_NEW}>
                  {t('import.categoryNew')}
                </SelectItem>
              </SelectContent>
            </Select>
            {categorySelection === CATEGORY_NEW ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={newCategoryName}
                  disabled={isImporting}
                  maxLength={200}
                  placeholder={t('import.categoryNamePlaceholder')}
                  onChange={(event) => {
                    setNewCategoryName(event.target.value)
                    resetResult()
                  }}
                />
                <Select
                  value={newCategoryParentId}
                  disabled={isImporting}
                  onValueChange={(value) => {
                    setNewCategoryParentId(value)
                    resetResult()
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CATEGORY_ROOT}>
                      {t('import.categoryRoot')}
                    </SelectItem>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {newCategoryParentId === CATEGORY_ROOT
                    ? t('import.categoryRootHint')
                    : t('import.subcategoryHint')}
                </p>
              </div>
            ) : null}
          </div>

          {parsedProducts ? (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{t('import.preview')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('import.recognized', { count: parsedProducts.length })}
                </p>
              </div>

              <Carousel opts={{ align: 'start', dragFree: true }} className="px-9">
                <CarouselContent className="-ml-3">
                  {parsedProducts.map((product, index) => {
                    const imageUrl = typeof product.imageUrl === 'string'
                      ? product.imageUrl.trim()
                      : ''
                    const sourceUrl = typeof product.sourceUrl === 'string'
                      ? product.sourceUrl.trim()
                      : ''
                    const name = typeof product.name === 'string' && product.name.trim()
                      ? product.name.trim()
                      : t('import.unnamedProduct')
                    const price = formatPreviewPrice(product, i18n.language)

                    return (
                      <CarouselItem
                        key={`${product.sku ?? product.slug ?? name}-${index}`}
                        className="basis-[160px] pl-3 sm:basis-[180px]"
                      >
                        <Card className="h-full gap-0 overflow-hidden py-0">
                          <div className="flex aspect-square items-center justify-center bg-muted">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="size-full object-cover"
                              />
                            ) : (
                              <ImageOff className="size-8 text-muted-foreground" />
                            )}
                          </div>
                          <CardContent className="space-y-1.5 p-2.5">
                            <p className="line-clamp-2 min-h-8 text-xs font-medium leading-4">
                              {name}
                            </p>
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold tabular-nums">
                                {price ?? t('import.priceMissing')}
                              </p>
                              {sourceUrl ? (
                                <a
                                  href={sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                  aria-label={t('import.openSource')}
                                  title={t('import.openSource')}
                                >
                                  <ExternalLink className="size-3.5" />
                                </a>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-0" />
                <CarouselNext className="right-0" />
              </Carousel>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{t('import.createCategories')}</p>
              <p className="text-xs text-muted-foreground">
                {t('import.createCategoriesHint')}
              </p>
            </div>
            <Switch
              checked={categorySelection === CATEGORY_NEW || createMissingCategories}
              disabled={isImporting || categorySelection === CATEGORY_NEW}
              onCheckedChange={setCreateMissingCategories}
            />
          </div>

          {total > 0 ? (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{finished ? t('import.completed') : t('import.inProgress')}</span>
                <span className="tabular-nums">{processed} / {total}</span>
              </div>
              <Progress value={progress} className="h-2" />
              {summary ? (
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <span>{t('import.inserted')}: <b>{summary.insertedCount}</b></span>
                  <span>{t('import.skipped')}: <b>{summary.skippedCount}</b></span>
                  <span>{t('import.failed')}: <b>{summary.failedCount}</b></span>
                  <span>{t('import.categoriesCreated')}: <b>{summary.categoriesCreatedCount}</b></span>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          ) : null}

          {notificationError ? (
            <Alert><AlertDescription>{notificationError}</AlertDescription></Alert>
          ) : null}

          {summary && summary.issues.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('import.issues')}</p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2 text-xs">
                {summary.issues.slice(0, 100).map((issue) => (
                  <p key={`${issue.index}-${issue.status}`}>
                    <b>#{issue.index + 1}</b>{issue.name ? ` · ${issue.name}` : ''}: {issue.message}
                  </p>
                ))}
                {summary.issues.length > 100 ? (
                  <p className="text-muted-foreground">
                    {t('import.moreIssues', { count: summary.issues.length - 100 })}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          </>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isImporting}
            onClick={() => onOpenChange(false)}
          >
            {finished ? t('close', { ns: 'common' }) : t('cancel', { ns: 'common' })}
          </Button>
          {source !== 'crawler' ? (
            <Button
              type="button"
              disabled={isImporting || input.trim().length === 0}
              onClick={() => void startImport()}
            >
              <Upload />
              {isImporting ? t('import.importing') : t('import.submit')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
