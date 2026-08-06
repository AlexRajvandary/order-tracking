import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpDown, CheckSquare, ChevronLeft, ChevronRight, EyeOff, LayoutGrid, SquareCheck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as productsApi from '@/features/products/api/productsApi'
import type {
  Brand,
  Category,
  Product,
  ProductConditionFilter,
  Shop,
} from '@/features/products/types'
import { ApiError } from '@/shared/api/client'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { cn } from '@/shared/lib/utils'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { SearchInput } from '@/shared/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Separator } from '@/shared/ui/separator'
import { Switch } from '@/shared/ui/switch'

const PAGE_SIZES = [20, 40, 60, 100] as const
const BULK_ID_CHUNK = 500
const CONDITION_OPTIONS: ProductConditionFilter[] = ['new', 'used']
type Density = 'comfortable' | 'dense'
type VisibilityFilter = 'all' | 'visible' | 'hidden'
type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'name'

type ConfirmState =
  | { kind: 'selected'; count: number }
  | { kind: 'category'; slug: string; name: string }
  | null

function toggleInSet(current: Set<string>, value: string): Set<string> {
  const next = new Set(current)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function formatPrice(value: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

function CategoryTree({
  categories,
  selectedSlug,
  onSelect,
  onHideCategory,
  hidePendingSlug,
}: {
  categories: Category[]
  selectedSlug: string | null
  onSelect: (slug: string | null) => void
  onHideCategory: (category: Category) => void
  hidePendingSlug: string | null
}) {
  const { t } = useTranslation('products')

  const row = (category: Category, nested: boolean) => (
    <div key={category.id} className="flex items-center gap-0.5">
      <button
        type="button"
        className={cn(
          'min-w-0 flex-1 rounded-lg px-2 text-left transition-colors',
          nested ? 'py-1 text-xs' : 'py-1.5 text-sm',
          selectedSlug === category.slug
            ? 'bg-primary/10 font-medium text-primary'
            : nested
              ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'text-foreground hover:bg-muted',
        )}
        onClick={() => onSelect(category.slug)}
      >
        <span className="line-clamp-2">{category.name}</span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        title={t('bulk.hideCategory')}
        aria-label={t('bulk.hideCategory')}
        disabled={hidePendingSlug === category.slug}
        onClick={(event) => {
          event.stopPropagation()
          onHideCategory(category)
        }}
      >
        <EyeOff />
      </Button>
    </div>
  )

  return (
    <ul className="space-y-1 text-sm">
      <li>
        <button
          type="button"
          className={cn(
            'w-full rounded-lg px-2 py-1.5 text-left transition-colors',
            selectedSlug == null
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          onClick={() => onSelect(null)}
        >
          {t('allCategories')}
        </button>
      </li>
      {categories.map((root) => (
        <li key={root.id} className="space-y-0.5">
          {row(root, false)}
          {root.children.length > 0 ? (
            <ul className="ml-2 space-y-0.5 border-l pl-1.5">
              {root.children.map((child) => (
                <li key={child.id}>{row(child, true)}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function FilterOptionList({
  title,
  options,
  selected,
  onToggle,
  maxHeightClass = 'max-h-40',
}: {
  title: string
  options: Array<{ value: string; label: string }>
  selected: Set<string>
  onToggle: (value: string) => void
  maxHeightClass?: string
}) {
  if (options.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className={cn('space-y-0.5 overflow-y-auto pr-1', maxHeightClass)}>
        {options.map((option) => {
          const checked = selected.has(option.value)
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                checked
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option.value)}
                className="size-3.5 accent-primary"
              />
              <span className="truncate">{option.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function ProductEditDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('products')
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!product || !open) return
    setName(product.name)
    setPrice(String(product.price))
    setOriginalPrice(product.originalPrice != null ? String(product.originalPrice) : '')
    setIsActive(product.isActive)
    setError(null)
  }, [product, open])

  const mutation = useMutation({
    mutationFn: () => {
      if (!product) throw new Error('No product')
      const parsedPrice = Number(price.replace(',', '.'))
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        throw new ApiError('Invalid price', 400)
      }
      const trimmedOriginal = originalPrice.trim()
      const clearOriginalPrice = trimmedOriginal === ''
      const parsedOriginal = clearOriginalPrice
        ? undefined
        : Number(trimmedOriginal.replace(',', '.'))
      if (parsedOriginal != null && (!Number.isFinite(parsedOriginal) || parsedOriginal < 0)) {
        throw new ApiError('Invalid original price', 400)
      }

      return productsApi.patchProduct(product.id, {
        name: name.trim(),
        price: parsedPrice,
        ...(clearOriginalPrice
          ? { clearOriginalPrice: true }
          : { originalPrice: parsedOriginal }),
        isActive,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : t('edit.saveError'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="product-name">{t('edit.name')}</Label>
            <Input
              id="product-name"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">{t('edit.price')}</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                value={price}
                required
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-original-price">{t('edit.originalPrice')}</Label>
              <Input
                id="product-original-price"
                inputMode="decimal"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <Label htmlFor="product-active" className="cursor-pointer">
              {t('edit.inCatalog')}
            </Label>
            <Switch
              id="product-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={mutation.isPending || !product}>
              {t('save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProductsToolbarPagination({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const { t } = useTranslation('products')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={String(pageSize)}
        onValueChange={(value) => onPageSizeChange(Number(value))}
      >
        <SelectTrigger className="w-[7.5rem]" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">
        {t('page', { page, total: Math.max(totalPages, 1) })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          aria-label={t('prev')}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          aria-label={t('next')}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

async function hideProductIds(ids: string[]) {
  let updated = 0
  for (let i = 0; i < ids.length; i += BULK_ID_CHUNK) {
    const chunk = ids.slice(i, i + BULK_ID_CHUNK)
    const result = await productsApi.setProductsVisibility({
      isActive: false,
      productIds: chunk,
    })
    updated += result.updatedCount
  }
  return updated
}

export function ProductsPage() {
  const { t, i18n } = useTranslation('products')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const normalizedSearch = debouncedSearch.trim()
  const activeSearch = normalizedSearch.length >= 2 ? normalizedSearch : null

  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  const [density, setDensity] = useState<Density>('dense')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(40)
  const [editing, setEditing] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(() => new Set())
  const [selectedShops, setSelectedShops] = useState<Set<string>>(() => new Set())
  const [selectedConditions, setSelectedConditions] = useState<Set<ProductConditionFilter>>(
    () => new Set(),
  )
  const [priceFrom, setPriceFrom] = useState('')
  const [priceTo, setPriceTo] = useState('')
  const [sort, setSort] = useState<SortOption>('relevance')

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const brandKey = useMemo(
    () => [...selectedBrands].sort().join(','),
    [selectedBrands],
  )
  const shopKey = useMemo(() => [...selectedShops].sort().join(','), [selectedShops])
  const conditionKey = useMemo(
    () => [...selectedConditions].sort().join(','),
    [selectedConditions],
  )

  useEffect(() => {
    setPage(1)
  }, [activeSearch, categorySlug, visibility, pageSize, brandKey, shopKey, conditionKey])

  useEffect(() => {
    if (!selectMode) setSelectedIds(new Set())
  }, [selectMode])

  const categoriesQuery = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: ({ signal }) => productsApi.listCategories(signal),
  })

  const brandsQuery = useQuery({
    queryKey: ['admin-product-brands'],
    queryFn: ({ signal }) => productsApi.listBrands(signal),
  })

  const shopsQuery = useQuery({
    queryKey: ['admin-product-shops'],
    queryFn: ({ signal }) => productsApi.listShops(signal),
  })

  const activeOnly =
    visibility === 'visible' ? true : visibility === 'hidden' ? false : null

  const productsQuery = useQuery({
    queryKey: [
      'admin-products',
      activeSearch,
      categorySlug,
      activeOnly,
      brandKey,
      shopKey,
      conditionKey,
      page,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      productsApi.listProducts(
        {
          search: activeSearch,
          activeOnly,
          category: categorySlug,
          includeCategoryChildren: categorySlug != null,
          brand: brandKey || null,
          shop: shopKey || null,
          condition: conditionKey || null,
          page,
          pageSize,
        },
        signal,
      ),
  })

  const pageItems = productsQuery.data?.items ?? []

  const displayItems = useMemo(() => {
    const min = priceFrom.trim() === '' ? null : Number(priceFrom.replace(',', '.'))
    const max = priceTo.trim() === '' ? null : Number(priceTo.replace(',', '.'))
    let list = [...pageItems]
    if (min != null && Number.isFinite(min)) {
      list = list.filter((p) => p.price >= min)
    }
    if (max != null && Number.isFinite(max)) {
      list = list.filter((p) => p.price <= max)
    }
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, i18n.language))
    return list
  }, [pageItems, priceFrom, priceTo, sort, i18n.language])

  const totalPages = Math.max(
    1,
    Math.ceil((productsQuery.data?.total ?? 0) / pageSize),
  )

  const filterActiveCount =
    selectedBrands.size +
    selectedShops.size +
    selectedConditions.size +
    (priceFrom.trim() ? 1 : 0) +
    (priceTo.trim() ? 1 : 0)

  const resetCatalogFilters = () => {
    setSelectedBrands(new Set())
    setSelectedShops(new Set())
    setSelectedConditions(new Set())
    setPriceFrom('')
    setPriceTo('')
    setSort('relevance')
  }

  const pageSelectableIds = useMemo(
    () => displayItems.filter((p) => p.isActive).map((p) => p.id),
    [displayItems],
  )

  const allPageSelected =
    pageSelectableIds.length > 0 &&
    pageSelectableIds.every((id) => selectedIds.has(id))

  const bulkMutation = useMutation({
    mutationFn: async (state: Exclude<ConfirmState, null>) => {
      if (state.kind === 'selected') {
        return hideProductIds([...selectedIds])
      }
      const result = await productsApi.setProductsVisibility({
        isActive: false,
        category: state.slug,
        includeCategoryChildren: true,
      })
      return result.updatedCount
    },
    onSuccess: async (updatedCount) => {
      setConfirm(null)
      setBulkError(null)
      setBulkMessage(t('bulk.success', { count: updatedCount }))
      setSelectedIds(new Set())
      setSelectMode(false)
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    },
    onError: (err: unknown) => {
      setBulkError(err instanceof ApiError ? err.message : t('bulk.error'))
    },
  })

  const openEdit = (product: Product) => {
    setEditing(product)
    setDialogOpen(true)
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePageSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allPageSelected) {
        for (const id of pageSelectableIds) next.delete(id)
      } else {
        for (const id of pageSelectableIds) next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          {productsQuery.data ? (
            <p className="text-sm text-muted-foreground">
              {t('count', { count: productsQuery.data.total })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectMode ? 'secondary' : 'outline'}
            onClick={() => {
              setSelectMode((v) => !v)
              setBulkMessage(null)
              setBulkError(null)
            }}
            aria-label={selectMode ? t('bulk.exitSelect') : t('bulk.selectMode')}
            title={selectMode ? t('bulk.exitSelect') : t('bulk.selectMode')}
          >
            {selectMode ? <SquareCheck /> : <CheckSquare />}
            <span className="hidden sm:inline">
              {selectMode ? t('bulk.exitSelect') : t('bulk.selectMode')}
            </span>
          </Button>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('searchPlaceholder')}
            className="w-full sm:w-56"
          />
          <Select
            value={visibility}
            onValueChange={(value) => setVisibility(value as VisibilityFilter)}
          >
            <SelectTrigger className="w-[10.5rem]" size="sm">
              <SelectValue placeholder={t('visibility.label')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('visibility.all')}</SelectItem>
              <SelectItem value="visible">{t('visibility.visible')}</SelectItem>
              <SelectItem value="hidden">{t('visibility.hidden')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <Button
              type="button"
              size="sm"
              variant={density === 'comfortable' ? 'secondary' : 'ghost'}
              onClick={() => setDensity('comfortable')}
            >
              {t('density.comfortable')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={density === 'dense' ? 'secondary' : 'ghost'}
              onClick={() => setDensity('dense')}
            >
              <LayoutGrid className="size-3.5" />
              {t('density.dense')}
            </Button>
          </div>
        </div>
      </div>

      {bulkMessage ? (
        <Alert>
          <AlertDescription>{bulkMessage}</AlertDescription>
        </Alert>
      ) : null}
      {bulkError ? (
        <Alert variant="destructive">
          <AlertDescription>{bulkError}</AlertDescription>
        </Alert>
      ) : null}

      {selectMode ? (
        <Card size="sm">
          <CardContent className="flex flex-wrap items-center gap-2 py-3">
            <span className="text-sm font-medium">
              {t('bulk.selected', { count: selectedIds.size })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pageSelectableIds.length === 0}
              onClick={togglePageSelection}
            >
              {allPageSelected ? t('bulk.clear') : t('bulk.selectPage')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selectedIds.size === 0}
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="size-3.5" />
              {t('bulk.clear')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.size === 0 || bulkMutation.isPending}
              onClick={() => {
                setBulkMessage(null)
                setBulkError(null)
                setConfirm({ kind: 'selected', count: selectedIds.size })
              }}
            >
              <EyeOff className="size-3.5" />
              {t('bulk.hideSelected')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card size="sm" className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('categories')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoriesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                {t('loading', { ns: 'common' })}
              </p>
            ) : categoriesQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
              </Alert>
            ) : (
              <CategoryTree
                categories={categoriesQuery.data?.items ?? []}
                selectedSlug={categorySlug}
                onSelect={setCategorySlug}
                hidePendingSlug={
                  confirm?.kind === 'category' ? confirm.slug : null
                }
                onHideCategory={(category) => {
                  setBulkMessage(null)
                  setBulkError(null)
                  setConfirm({
                    kind: 'category',
                    slug: category.slug,
                    name: category.name,
                  })
                }}
              />
            )}

            <Separator />

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t('filters')}</p>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={filterActiveCount === 0 && sort === 'relevance'}
                onClick={resetCatalogFilters}
              >
                {t('resetFilters')}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('price')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="price-from" className="text-xs text-muted-foreground">
                    {t('priceFrom')}
                  </Label>
                  <Input
                    id="price-from"
                    inputMode="decimal"
                    value={priceFrom}
                    placeholder="0"
                    onChange={(e) => setPriceFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="price-to" className="text-xs text-muted-foreground">
                    {t('priceTo')}
                  </Label>
                  <Input
                    id="price-to"
                    inputMode="decimal"
                    value={priceTo}
                    placeholder="∞"
                    onChange={(e) => setPriceTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <FilterOptionList
              title={t('condition')}
              options={CONDITION_OPTIONS.map((value) => ({
                value,
                label: value === 'new' ? t('conditionNew') : t('conditionUsed'),
              }))}
              selected={selectedConditions as Set<string>}
              onToggle={(value) =>
                setSelectedConditions((current) =>
                  toggleInSet(current, value) as Set<ProductConditionFilter>,
                )
              }
            />

            <FilterOptionList
              title={t('shops')}
              options={(shopsQuery.data?.items ?? []).map((shop: Shop) => ({
                value: shop.slug,
                label: shop.name,
              }))}
              selected={selectedShops}
              onToggle={(value) => setSelectedShops((current) => toggleInSet(current, value))}
            />

            <FilterOptionList
              title={t('brands')}
              options={(brandsQuery.data?.items ?? []).map((brand: Brand) => ({
                value: brand.slug,
                label: brand.name,
              }))}
              selected={selectedBrands}
              onToggle={(value) => setSelectedBrands((current) => toggleInSet(current, value))}
            />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {productsQuery.data
                ? t('showing', { count: displayItems.length })
                : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as SortOption)}
              >
                <SelectTrigger className="w-[12.5rem]" size="sm">
                  <ArrowUpDown className="size-3.5 opacity-60" />
                  <SelectValue placeholder={t('sort.label')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{t('sort.relevance')}</SelectItem>
                  <SelectItem value="price-asc">{t('sort.priceAsc')}</SelectItem>
                  <SelectItem value="price-desc">{t('sort.priceDesc')}</SelectItem>
                  <SelectItem value="name">{t('sort.name')}</SelectItem>
                </SelectContent>
              </Select>
              <ProductsToolbarPagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>

          {productsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t('loading', { ns: 'common' })}
            </p>
          ) : productsQuery.isError ? (
            <div className="space-y-2">
              <Alert variant="destructive">
                <AlertDescription>{t('error', { ns: 'common' })}</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => void productsQuery.refetch()}>
                {t('retry', { ns: 'common' })}
              </Button>
            </div>
          ) : !displayItems.length ? (
            <Card size="sm">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t('empty')}
              </CardContent>
            </Card>
          ) : (
            <div
              className={cn(
                'grid grid-cols-2 gap-3',
                density === 'dense' ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
              )}
            >
              {displayItems.map((product) => {
                const selected = selectedIds.has(product.id)
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      if (selectMode) {
                        if (product.isActive) toggleSelected(product.id)
                        return
                      }
                      openEdit(product)
                    }}
                    className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Card
                      size="sm"
                      className={cn(
                        'h-full gap-0 overflow-hidden pt-0 transition-colors hover:border-primary/40 hover:bg-muted/40',
                        selectMode && selected && 'border-primary ring-2 ring-primary/30',
                        selectMode && !product.isActive && 'opacity-60',
                      )}
                    >
                      <div className="relative aspect-square bg-muted">
                        <img
                          src={product.imageUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="size-full object-cover"
                          loading="lazy"
                        />
                        {selectMode ? (
                          <span
                            className={cn(
                              'absolute right-2 top-2 flex size-6 items-center justify-center rounded-md border bg-background/90',
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground',
                              !product.isActive && 'opacity-40',
                            )}
                          >
                            {selected ? (
                              <CheckSquare className="size-3.5" />
                            ) : (
                              <span className="size-3.5 rounded-sm border border-current" />
                            )}
                          </span>
                        ) : null}
                        {!product.isActive ? (
                          <Badge
                            variant="secondary"
                            className="absolute left-2 top-2"
                          >
                            {t('hidden')}
                          </Badge>
                        ) : null}
                      </div>
                      <CardContent className="space-y-1 p-2.5">
                        <p className="line-clamp-2 text-xs font-medium leading-snug">
                          {product.name}
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatPrice(
                            product.price,
                            product.currencyCode,
                            i18n.language,
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>
          )}

          {displayItems.length > 0 ? (
            <div className="flex justify-end">
              <ProductsToolbarPagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          ) : null}
        </div>
      </div>

      <ProductEditDialog
        product={editing}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />

      <Dialog
        open={confirm != null}
        onOpenChange={(open) => {
          if (!open && !bulkMutation.isPending) setConfirm(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === 'category'
                ? t('bulk.hideCategoryConfirmTitle')
                : t('bulk.hideSelectedConfirmTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirm?.kind === 'category'
              ? t('bulk.hideCategoryConfirm', { name: confirm.name })
              : t('bulk.hideSelectedConfirm', { count: confirm?.count ?? 0 })}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={bulkMutation.isPending}
              onClick={() => setConfirm(null)}
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              type="button"
              disabled={bulkMutation.isPending || confirm == null}
              onClick={() => {
                if (confirm) bulkMutation.mutate(confirm)
              }}
            >
              {t('bulk.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
