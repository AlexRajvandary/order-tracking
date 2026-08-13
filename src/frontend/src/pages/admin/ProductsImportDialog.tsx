import { FileJson, Upload } from 'lucide-react'
import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as productsApi from '@/features/products/api/productsApi'
import type {
  ImportProductIssue,
  ImportProductItem,
  ImportProductsResult,
} from '@/features/products/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Progress } from '@/shared/ui/progress'
import { Switch } from '@/shared/ui/switch'
import { Textarea } from '@/shared/ui/textarea'

const IMPORT_BATCH_SIZE = 100
const EXAMPLE_JSON = `[
  {
    "name": "Example product",
    "price": 12990,
    "currencyCode": "RUB",
    "imageUrl": "https://example.com/product.jpg",
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

export function ProductsImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => Promise<void> | void
}) {
  const { t } = useTranslation('products')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [json, setJson] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [createMissingCategories, setCreateMissingCategories] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parsedCount = useMemo(() => {
    if (!json.trim()) return null
    try {
      return parseProducts(json).length
    } catch {
      return null
    }
  }, [json])

  const resetResult = () => {
    setProcessed(0)
    setTotal(0)
    setSummary(null)
    setError(null)
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setJson(await file.text())
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
      products = parseProducts(json)
    } catch (parseError) {
      const reason = parseError instanceof Error ? parseError.message : ''
      setError(t(`import.parseErrors.${reason || 'json'}`))
      return
    }

    setIsImporting(true)
    setError(null)
    setProcessed(0)
    setTotal(products.length)
    let nextSummary = emptySummary()

    try {
      for (let offset = 0; offset < products.length; offset += IMPORT_BATCH_SIZE) {
        const batch = products.slice(offset, offset + IMPORT_BATCH_SIZE)
        const result = await productsApi.importProducts({
          products: batch,
          createMissingCategories,
        })
        nextSummary = mergeSummary(nextSummary, result, offset)
        setSummary(nextSummary)
        setProcessed(Math.min(offset + batch.length, products.length))
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('import.description')}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
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
              <FileJson />
              {t('import.chooseFile')}
            </Button>
            {fileName ? (
              <span className="max-w-full truncate text-sm text-muted-foreground">
                {fileName}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isImporting}
              onClick={() => {
                setJson(EXAMPLE_JSON)
                setFileName(null)
                resetResult()
              }}
            >
              {t('import.showExample')}
            </Button>
          </div>

          <Textarea
            value={json}
            disabled={isImporting}
            className="min-h-64 resize-y font-mono text-xs"
            placeholder={t('import.placeholder')}
            spellCheck={false}
            onChange={(event) => {
              setJson(event.target.value)
              setFileName(null)
              resetResult()
            }}
          />

          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{t('import.createCategories')}</p>
              <p className="text-xs text-muted-foreground">
                {t('import.createCategoriesHint')}
              </p>
            </div>
            <Switch
              checked={createMissingCategories}
              disabled={isImporting}
              onCheckedChange={setCreateMissingCategories}
            />
          </div>

          {parsedCount != null && total === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('import.recognized', { count: parsedCount })}
            </p>
          ) : null}

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
          <Button
            type="button"
            disabled={isImporting || json.trim().length === 0}
            onClick={() => void startImport()}
          >
            <Upload />
            {isImporting ? t('import.importing') : t('import.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
