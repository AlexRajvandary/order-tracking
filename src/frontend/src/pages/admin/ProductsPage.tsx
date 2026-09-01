import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpDown, CheckSquare, ChevronLeft, ChevronRight, EyeOff, MoreHorizontal, Pencil, Plus, Trash2, Upload, X, Table2, LayoutGrid } from 'lucide-react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
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
import { DataTable, DataTableColumnHeader } from '@/shared/ui/data-table'
import { ProductsImportDialog } from './ProductsImportDialog'

const PAGE_SIZES = [20, 40, 60, 100] as const
const BULK_ID_CHUNK = 500
const CONDITION_OPTIONS: ProductConditionFilter[] = ['new', 'used']
type VisibilityFilter = 'all' | 'visible' | 'hidden'
type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'name'

const ALL_CATEGORIES_VALUE = '__all_categories__'
const NO_PRODUCT_CATEGORY = '__no_product_category__'
const NO_PRODUCT_SUBCATEGORY = '__no_product_subcategory__'
const NO_PRODUCT_SHOP = '__no_product_shop__'
const BULK_UNCHANGED = '__bulk_unchanged__'
const BULK_CLEAR = '__bulk_clear__'
const MOBILE_PRODUCTS_QUERY = '(max-width: 639px)'

function subscribeToMobileProducts(callback: () => void) {
  const media = window.matchMedia(MOBILE_PRODUCTS_QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function getMobileProductsSnapshot() {
  return window.matchMedia(MOBILE_PRODUCTS_QUERY).matches
}

function useMobileProductsLayout() {
  return useSyncExternalStore(subscribeToMobileProducts, getMobileProductsSnapshot, () => false)
}

type CategoryAction =
  | { kind: 'create'; parent: Category | null }
  | { kind: 'rename'; category: Category }
  | { kind: 'delete'; category: Category }
  | null

type ConfirmState =
  | { kind: 'selected'; count: number }
  | { kind: 'filtered'; count: number }
  | { kind: 'category'; slug: string; name: string }
  | null

function parseOptionalPrice(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const value = Number(trimmed.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function toggleInSet(current: Set<string>, value: string): Set<string> {
  const next = new Set(current)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function flattenCategoryOptions(
  categories: Category[],
  depth = 0,
): Array<{ value: string; label: string }> {
  return categories.flatMap((category) => [
    {
      value: category.slug,
      label: `${depth > 0 ? `${'— '.repeat(depth)}` : ''}${category.name}`,
    },
    ...flattenCategoryOptions(category.children, depth + 1),
  ])
}

function findCategoryPath(categories: Category[], id: string): Category[] | null {
  for (const category of categories) {
    if (category.id === id) return [category]
    const childPath = findCategoryPath(category.children, id)
    if (childPath) return [category, ...childPath]
  }
  return null
}

function flattenCategoryChildren(
  categories: Category[],
  depth = 0,
): Array<{ value: string; label: string }> {
  return categories.flatMap((category) => [
    {
      value: category.id,
      label: `${depth > 0 ? `${'— '.repeat(depth)}` : ''}${category.name}`,
    },
    ...flattenCategoryChildren(category.children, depth + 1),
  ])
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
  totalProductCount,
  selectedSlug,
  onSelect,
  onHideCategory,
  onAddSubcategory,
  onRenameCategory,
  onDeleteCategory,
  hidePendingSlug,
}: {
  categories: Category[]
  totalProductCount: number
  selectedSlug: string | null
  onSelect: (slug: string | null) => void
  onHideCategory: (category: Category) => void
  onAddSubcategory: (category: Category) => void
  onRenameCategory: (category: Category) => void
  onDeleteCategory: (category: Category) => void
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
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2">{category.name}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {category.productCount}
          </span>
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={t('categoryManagement.actions')}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!nested ? (
            <DropdownMenuItem onSelect={() => onAddSubcategory(category)}>
              <Plus />
              {t('categoryManagement.addSubcategory')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => onRenameCategory(category)}>
            <Pencil />
            {t('categoryManagement.rename')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={hidePendingSlug === category.slug}
            onSelect={() => onHideCategory(category)}
          >
            <EyeOff />
            {t('bulk.hideCategory')}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => onDeleteCategory(category)}
          >
            <Trash2 />
            {t('categoryManagement.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
          <span className="flex items-center justify-between gap-2">
            <span>{t('allCategories')}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {totalProductCount}
            </span>
          </span>
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
  categories,
  shops,
}: {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  shops: Shop[]
}) {
  const { t } = useTranslation('products')
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [categoryId, setCategoryId] = useState(NO_PRODUCT_CATEGORY)
  const [subcategoryId, setSubcategoryId] = useState(NO_PRODUCT_SUBCATEGORY)
  const [shopId, setShopId] = useState(NO_PRODUCT_SHOP)
  const [error, setError] = useState<string | null>(null)

  const selectedRootCategory = categories.find((category) => category.id === categoryId)
  const subcategoryOptions = useMemo(
    () => flattenCategoryChildren(selectedRootCategory?.children ?? []),
    [selectedRootCategory?.children],
  )

  useEffect(() => {
    if (!product || !open) return
    setName(product.name)
    setPrice(String(product.price))
    setOriginalPrice(product.originalPrice != null ? String(product.originalPrice) : '')
    setIsActive(product.isActive)
    const categoryPath = product.categoryId
      ? findCategoryPath(categories, product.categoryId)
      : null
    setCategoryId(categoryPath?.[0]?.id ?? NO_PRODUCT_CATEGORY)
    setSubcategoryId(
      categoryPath && categoryPath.length > 1
        ? categoryPath.at(-1)!.id
        : NO_PRODUCT_SUBCATEGORY,
    )
    setShopId(product.shopId ?? NO_PRODUCT_SHOP)
    setError(null)
  }, [categories, product, open])

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
      const selectedCategoryId = subcategoryId !== NO_PRODUCT_SUBCATEGORY
        ? subcategoryId
        : categoryId !== NO_PRODUCT_CATEGORY
          ? categoryId
          : null

      return productsApi.patchProduct(product.id, {
        name: name.trim(),
        price: parsedPrice,
        ...(clearOriginalPrice
          ? { clearOriginalPrice: true }
          : { originalPrice: parsedOriginal }),
        isActive,
        ...(selectedCategoryId
          ? { categoryId: selectedCategoryId }
          : { clearCategory: true }),
        ...(shopId !== NO_PRODUCT_SHOP
          ? { shopId }
          : { clearShop: true }),
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] }),
      ])
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('edit.category')}</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value)
                  setSubcategoryId(NO_PRODUCT_SUBCATEGORY)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PRODUCT_CATEGORY}>
                    {t('edit.noCategory')}
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('edit.subcategory')}</Label>
              <Select
                value={subcategoryId}
                disabled={categoryId === NO_PRODUCT_CATEGORY || subcategoryOptions.length === 0}
                onValueChange={setSubcategoryId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PRODUCT_SUBCATEGORY}>
                    {t('edit.noSubcategory')}
                  </SelectItem>
                  {subcategoryOptions.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('edit.shop')}</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PRODUCT_SHOP}>
                  {t('edit.noShop')}
                </SelectItem>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <SelectTrigger className="w-16" size="sm">
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

function ProductGridItem({
  product,
  selected,
  selectMode,
  hiddenLabel,
  locale,
  onClick,
}: {
  product: Product
  selected: boolean
  selectMode: boolean
  hiddenLabel: string
  locale: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Card
        size="sm"
        className={cn(
          'h-full gap-0 overflow-hidden pt-0 transition-colors hover:border-primary/40 hover:bg-muted/40',
          selectMode && selected && 'border-primary ring-2 ring-primary/30',
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
            <Badge variant="secondary" className="absolute left-2 top-2">
              {hiddenLabel}
            </Badge>
          ) : null}
          {product.shopName ? (
            <Badge
              variant="outline"
              title={product.shopName}
              className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate bg-background/90 shadow-sm backdrop-blur"
            >
              {product.shopName}
            </Badge>
          ) : null}
        </div>
        <CardContent className="space-y-1 p-2.5">
          <p className="line-clamp-2 text-xs font-medium leading-snug">
            {product.name}
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {formatPrice(product.price, product.currencyCode, locale)}
          </p>
        </CardContent>
      </Card>
    </button>
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isMobileProductsLayout = useMobileProductsLayout()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const normalizedSearch = debouncedSearch.trim()
  const activeSearch = normalizedSearch.length >= 2 ? normalizedSearch : null

  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(40)
  const [editing, setEditing] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

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
  const [selectAllFiltered, setSelectAllFiltered] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [categoryAction, setCategoryAction] = useState<CategoryAction>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkCategory, setBulkCategory] = useState(BULK_UNCHANGED)
  const [bulkShop, setBulkShop] = useState(BULK_UNCHANGED)
  const [bulkEditError, setBulkEditError] = useState<string | null>(null)

  const brandKey = useMemo(
    () => [...selectedBrands].sort().join(','),
    [selectedBrands],
  )
  const shopKey = useMemo(() => [...selectedShops].sort().join(','), [selectedShops])
  const conditionKey = useMemo(
    () => [...selectedConditions].sort().join(','),
    [selectedConditions],
  )
  const priceMin = parseOptionalPrice(priceFrom)
  const priceMax = parseOptionalPrice(priceTo)

  useEffect(() => {
    setPage(1)
  }, [activeSearch, categorySlug, visibility, pageSize, brandKey, shopKey, conditionKey, priceMin, priceMax])

  useEffect(() => {
    if (!selectMode) {
      setSelectedIds(new Set())
      setSelectAllFiltered(false)
    }
  }, [selectMode])

  useEffect(() => {
    setSelectAllFiltered(false)
    setSelectedIds(new Set())
  }, [activeSearch, categorySlug, visibility, brandKey, shopKey, conditionKey, priceMin, priceMax])

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

  const categoriesQuery = useQuery({
    queryKey: ['admin-product-categories', activeOnly],
    queryFn: ({ signal }) => productsApi.listCategories(activeOnly, signal),
  })

  const categoryOptions = useMemo(
    () => flattenCategoryOptions(categoriesQuery.data?.items ?? []),
    [categoriesQuery.data?.items],
  )

  const listFilters = useMemo(
    () => ({
      search: activeSearch,
      activeOnly,
      category: categorySlug,
      includeCategoryChildren: categorySlug != null,
      brand: brandKey || null,
      shop: shopKey || null,
      condition: conditionKey || null,
      priceMin,
      priceMax,
    }),
    [
      activeSearch,
      activeOnly,
      categorySlug,
      brandKey,
      shopKey,
      conditionKey,
      priceMin,
      priceMax,
    ],
  )

  const productsQuery = useQuery({
    queryKey: [
      'admin-products',
      activeSearch,
      categorySlug,
      activeOnly,
      brandKey,
      shopKey,
      conditionKey,
      priceMin,
      priceMax,
      page,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      productsApi.listProducts(
        {
          ...listFilters,
          page,
          pageSize,
        },
        signal,
      ),
  })

  const pageItems = useMemo(
    () => productsQuery.data?.items ?? [],
    [productsQuery.data?.items],
  )
  const mobileDatasetKey = [
    activeSearch ?? '',
    categorySlug ?? '',
    visibility,
    brandKey,
    shopKey,
    conditionKey,
    priceMin ?? '',
    priceMax ?? '',
    page,
    pageSize,
    productsQuery.dataUpdatedAt,
  ].join('|')
  const [mobilePages, setMobilePages] = useState<{
    key: string
    items: Product[]
    loadedPage: number
  }>({ key: mobileDatasetKey, items: [], loadedPage: page })
  const activeMobilePages =
    mobilePages.key === mobileDatasetKey
      ? mobilePages
      : { key: mobileDatasetKey, items: [], loadedPage: page }

  const mobileLoadMutation = useMutation({
    mutationFn: ({ nextPage }: { key: string; nextPage: number }) =>
      productsApi.listProducts({
        ...listFilters,
        page: nextPage,
        pageSize,
      }),
    onSuccess: (result, variables) => {
      setMobilePages((current) => ({
        key: variables.key,
        items:
          current.key === variables.key
            ? [...current.items, ...result.items]
            : result.items,
        loadedPage: variables.nextPage,
      }))
    },
  })

  const displayItems = useMemo(() => {
    let list = [...pageItems]
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, i18n.language))
    return list
  }, [pageItems, sort, i18n.language])

  const mobileDisplayItems = useMemo(() => {
    const byId = new Map(pageItems.map((product) => [product.id, product]))
    activeMobilePages.items.forEach((product) => byId.set(product.id, product))
    const list = [...byId.values()]
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, i18n.language))
    return list
  }, [pageItems, activeMobilePages.items, sort, i18n.language])

  const activeDisplayItems = isMobileProductsLayout ? mobileDisplayItems : displayItems

  const tableColumns = useMemo<ColumnDef<Product>[]>(() => {
    const text = (id: keyof Product, label: string) => ({
      id, accessorFn: (row: Product) => row[id] ?? '', meta: { label },
      header: ({ column, table }: any) => <DataTableColumnHeader column={column} table={table} title={label} />,
      cell: ({ row }: any) => String(row.original[id] ?? '—'),
    })
    return [
      text('nameRu', 'Русское название'),
      text('id', 'ID'), text('name', 'Название'), text('sku', 'SKU'), text('description', 'Описание'),
      text('brand', 'Бренд'), text('condition', 'Состояние'), text('categoryName', 'Категория'),
      text('shopName', 'Магазин'), text('price', 'Цена'), text('originalPrice', 'Цена оригинала'),
      text('currencyCode', 'Валюта'), text('sourceUrl', 'Ссылка на источник'), text('isActive', 'Публичный'),
      text('createdAt', 'Создан'), text('updatedAt', 'Изменён'),
    ]
  }, [])

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
    () => activeDisplayItems.map((p) => p.id),
    [activeDisplayItems],
  )

  const allPageSelected =
    !selectAllFiltered &&
    pageSelectableIds.length > 0 &&
    pageSelectableIds.every((id) => selectedIds.has(id))

  const selectedCount = selectAllFiltered
    ? (productsQuery.data?.total ?? 0)
    : selectedIds.size

  const bulkMutation = useMutation({
    mutationFn: async (state: Exclude<ConfirmState, null>) => {
      if (state.kind === 'selected') {
        return hideProductIds([...selectedIds])
      }
      if (state.kind === 'filtered') {
        const result = await productsApi.setProductsVisibility({
          isActive: false,
          matchFilters: true,
          search: listFilters.search,
          activeOnly: true,
          brand: listFilters.brand,
          shop: listFilters.shop,
          condition: listFilters.condition,
          category: listFilters.category ?? undefined,
          includeCategoryChildren: listFilters.includeCategoryChildren,
          priceMin: listFilters.priceMin,
          priceMax: listFilters.priceMax,
        })
        return result.updatedCount
      }
      const result = await productsApi.setProductsVisibility({
        isActive: false,
        category: state.slug,
        includeCategoryChildren: true,
        activeOnly: true,
      })
      return result.updatedCount
    },
    onSuccess: async (updatedCount) => {
      setConfirm(null)
      setBulkError(null)
      setBulkMessage(t('bulk.success', { count: updatedCount }))
      setSelectedIds(new Set())
      setSelectAllFiltered(false)
      setSelectMode(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] }),
      ])
    },
    onError: (err: unknown) => {
      setBulkError(err instanceof ApiError ? err.message : t('bulk.error'))
    },
  })

  const categoryMutation = useMutation({
    mutationFn: async (action: Exclude<CategoryAction, null>) => {
      if (action.kind === 'delete') {
        return productsApi.deleteCategory(action.category.id)
      }
      const name = categoryName.trim()
      if (!name) throw new Error(t('categoryManagement.nameRequired'))
      if (action.kind === 'rename') {
        return productsApi.renameCategory(action.category.id, { name })
      }
      return productsApi.createCategory({
        name,
        parentId: action.parent?.id ?? null,
      })
    },
    onSuccess: async () => {
      setCategoryAction(null)
      setCategoryName('')
      setCategoryError(null)
      setCategorySlug(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] }),
      ])
    },
    onError: (err: unknown) => {
      setCategoryError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t('categoryManagement.error'),
      )
    },
  })

  const bulkEditMutation = useMutation({
    mutationFn: async () => {
      const updateCategory = bulkCategory !== BULK_UNCHANGED
      const updateShop = bulkShop !== BULK_UNCHANGED
      const selection = selectAllFiltered
        ? {
            matchFilters: true,
            search: listFilters.search,
            activeOnly: listFilters.activeOnly,
            brand: listFilters.brand,
            shop: listFilters.shop,
            condition: listFilters.condition,
            category: listFilters.category,
            includeCategoryChildren: listFilters.includeCategoryChildren,
            priceMin: listFilters.priceMin,
            priceMax: listFilters.priceMax,
          }
        : { productIds: [...selectedIds] }

      const request = {
        ...selection,
        updateCategory,
        newCategoryId:
          updateCategory && bulkCategory !== BULK_CLEAR ? bulkCategory : null,
        updateShop,
        newShopId: updateShop && bulkShop !== BULK_CLEAR ? bulkShop : null,
      }

      if (selectAllFiltered) return productsApi.bulkUpdateProducts(request)

      let updatedCount = 0
      const ids = [...selectedIds]
      for (let index = 0; index < ids.length; index += BULK_ID_CHUNK) {
        const result = await productsApi.bulkUpdateProducts({
          ...request,
          productIds: ids.slice(index, index + BULK_ID_CHUNK),
        })
        updatedCount += result.updatedCount
      }
      return { updatedCount }
    },
    onSuccess: async (result) => {
      setBulkEditOpen(false)
      setBulkCategory(BULK_UNCHANGED)
      setBulkShop(BULK_UNCHANGED)
      setBulkEditError(null)
      setBulkMessage(t('bulk.editSuccess', { count: result.updatedCount }))
      setSelectedIds(new Set())
      setSelectAllFiltered(false)
      setSelectMode(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] }),
      ])
    },
    onError: (err: unknown) => {
      setBulkEditError(err instanceof ApiError ? err.message : t('bulk.editError'))
    },
  })

  const openCategoryAction = (action: Exclude<CategoryAction, null>) => {
    setCategoryError(null)
    setCategoryName(action.kind === 'rename' ? action.category.name : '')
    setCategoryAction(action)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setDialogOpen(true)
  }

  const toggleSelected = (id: string) => {
    setSelectAllFiltered(false)
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePageSelection = () => {
    setSelectAllFiltered(false)
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

  const selectAllMatchingFilters = () => {
    setSelectedIds(new Set())
    setSelectAllFiltered(true)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectAllFiltered(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="shrink-0 lg:w-44">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          {productsQuery.data ? (
            <p className="text-sm text-muted-foreground">
              {t('count', { count: productsQuery.data.total })}
            </p>
          ) : null}
        </div>

        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('searchPlaceholder')}
          className="w-full min-w-0 lg:max-w-xl lg:flex-1"
        />

        <Select
          value={categorySlug ?? ALL_CATEGORIES_VALUE}
          onValueChange={(value) =>
            setCategorySlug(value === ALL_CATEGORIES_VALUE ? null : value)
          }
        >
          <SelectTrigger className="w-full lg:w-56" size="sm">
            <SelectValue placeholder={t('allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES_VALUE}>{t('allCategories')}</SelectItem>
            {categoryOptions.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap">
          <Button type="button" variant={viewMode === 'table' ? 'secondary' : 'outline'} size="icon-sm" aria-label="Таблица" title="Таблица" onClick={() => setViewMode('table')}><Table2 /></Button>
          <Button type="button" variant={viewMode === 'cards' ? 'secondary' : 'outline'} size="icon-sm" aria-label="Карточки" title="Карточки" onClick={() => setViewMode('cards')}><LayoutGrid /></Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload />
            {t('import.button')}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant={selectMode ? 'secondary' : 'outline'}
            onClick={() => {
              setSelectMode((v) => !v)
              setBulkMessage(null)
              setBulkError(null)
            }}
            aria-label={selectMode ? t('bulk.exitSelect') : t('bulk.selectMode')}
            title={selectMode ? t('bulk.exitSelect') : t('bulk.selectMode')}
          >
            <Pencil />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={sort === 'relevance' ? 'outline' : 'secondary'}
                size="icon-sm"
                aria-label={t('sort.label')}
                title={`${t('sort.label')}: ${t(`sort.${sort === 'price-asc' ? 'priceAsc' : sort === 'price-desc' ? 'priceDesc' : sort}`)}`}
              >
                <ArrowUpDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52" align="start">
              <DropdownMenuLabel>{t('sort.label')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => setSort(value as SortOption)}
              >
                <DropdownMenuRadioItem value="relevance">
                  {t('sort.relevance')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price-asc">
                  {t('sort.priceAsc')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price-desc">
                  {t('sort.priceDesc')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">
                  {t('sort.name')}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <p className="text-sm text-muted-foreground">
            {productsQuery.data
              ? t('showing', { count: activeDisplayItems.length })
              : null}
          </p>
          <div className="hidden sm:block">
              <ProductsToolbarPagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
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
              {selectAllFiltered
                ? t('bulk.selectedAll', { count: selectedCount })
                : t('bulk.selected', { count: selectedCount })}
            </span>
            <Button
              type="button"
              size="sm"
              variant={selectAllFiltered ? 'secondary' : 'outline'}
              disabled={(productsQuery.data?.total ?? 0) === 0 || productsQuery.isLoading}
              onClick={selectAllMatchingFilters}
            >
              {t('bulk.selectAll')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pageSelectableIds.length === 0}
              onClick={togglePageSelection}
            >
              {allPageSelected ? t('bulk.clearPage') : t('bulk.selectPage')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selectedCount === 0}
              onClick={clearSelection}
            >
              <X className="size-3.5" />
              {t('bulk.clear')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selectedCount === 0}
              onClick={() => {
                setBulkEditError(null)
                setBulkCategory(BULK_UNCHANGED)
                setBulkShop(BULK_UNCHANGED)
                setBulkEditOpen(true)
              }}
            >
              <Pencil className="size-3.5" />
              {t('bulk.editSelected')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedCount === 0 || bulkMutation.isPending}
              onClick={() => {
                setBulkMessage(null)
                setBulkError(null)
                if (selectAllFiltered) {
                  setConfirm({ kind: 'filtered', count: selectedCount })
                } else {
                  setConfirm({ kind: 'selected', count: selectedIds.size })
                }
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
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">{t('categories')}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title={t('categoryManagement.addCategory')}
                aria-label={t('categoryManagement.addCategory')}
                onClick={() => openCategoryAction({ kind: 'create', parent: null })}
              >
                <Plus />
              </Button>
            </div>
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
                totalProductCount={categoriesQuery.data?.totalProductCount ?? 0}
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
                onAddSubcategory={(category) =>
                  openCategoryAction({ kind: 'create', parent: category })
                }
                onRenameCategory={(category) =>
                  openCategoryAction({ kind: 'rename', category })
                }
                onDeleteCategory={(category) =>
                  openCategoryAction({ kind: 'delete', category })
                }
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
          ) : !activeDisplayItems.length ? (
            <Card size="sm">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t('empty')}
              </CardContent>
            </Card>
          ) : viewMode === 'table' ? (
            <DataTable
              tableId="products"
              columns={tableColumns}
              data={displayItems}
              pageSize={10}
              showPagination={false}
              onRowClick={(row) => navigate(`/admin/products/${row.original.id}`)}
              getRowClassName={() => 'cursor-pointer'}
              emptyMessage={t('empty')}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:hidden">
                {activeDisplayItems.map((product) => (
                  <ProductGridItem
                    key={product.id}
                    product={product}
                    selected={selectAllFiltered || selectedIds.has(product.id)}
                    selectMode={selectMode}
                    hiddenLabel={t('hidden')}
                    locale={i18n.language}
                    onClick={() => {
                      if (selectMode) toggleSelected(product.id)
                      else openEdit(product)
                    }}
                  />
                ))}
              </div>
              <div className="hidden grid-cols-2 gap-3 sm:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {displayItems.map((product) => (
                  <ProductGridItem
                    key={product.id}
                    product={product}
                    selected={selectAllFiltered || selectedIds.has(product.id)}
                    selectMode={selectMode}
                    hiddenLabel={t('hidden')}
                    locale={i18n.language}
                    onClick={() => {
                      if (selectMode) toggleSelected(product.id)
                      else openEdit(product)
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {activeDisplayItems.length > 0 ? (
            <div className="flex justify-center sm:justify-end">
              {activeMobilePages.loadedPage < totalPages ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:hidden"
                  disabled={mobileLoadMutation.isPending}
                  onClick={() => mobileLoadMutation.mutate({
                    key: mobileDatasetKey,
                    nextPage: activeMobilePages.loadedPage + 1,
                  })}
                >
                  {mobileLoadMutation.isPending
                    ? t('loading', { ns: 'common' })
                    : mobileLoadMutation.isError
                      ? t('retry', { ns: 'common' })
                      : t('loadMore')}
                </Button>
              ) : null}
              {viewMode !== 'table' ? (
                <div className="hidden sm:block">
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
          ) : null}
        </div>
      </div>

      <ProductEditDialog
        product={editing}
        open={dialogOpen}
        categories={categoriesQuery.data?.items ?? []}
        shops={shopsQuery.data?.items ?? []}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />

      <ProductsImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        categories={categoriesQuery.data?.items ?? []}
        onImported={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-product-brands'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-product-shops'] }),
          ])
        }}
      />

      <Dialog
        open={categoryAction != null}
        onOpenChange={(open) => {
          if (!open && !categoryMutation.isPending) {
            setCategoryAction(null)
            setCategoryError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryAction?.kind === 'delete'
                ? t('categoryManagement.deleteTitle')
                : categoryAction?.kind === 'rename'
                  ? t('categoryManagement.renameTitle')
                  : categoryAction?.parent
                    ? t('categoryManagement.addSubcategoryTitle')
                    : t('categoryManagement.addCategoryTitle')}
            </DialogTitle>
          </DialogHeader>
          {categoryAction?.kind === 'delete' ? (
            <p className="text-sm text-muted-foreground">
              {t('categoryManagement.deleteDescription', {
                name: categoryAction.category.name,
              })}
            </p>
          ) : (
            <div className="space-y-2">
              {categoryAction?.kind === 'create' && categoryAction.parent ? (
                <p className="text-sm text-muted-foreground">
                  {t('categoryManagement.parent', { name: categoryAction.parent.name })}
                </p>
              ) : null}
              <Label htmlFor="category-name">{t('categoryManagement.name')}</Label>
              <Input
                id="category-name"
                value={categoryName}
                autoFocus
                maxLength={200}
                onChange={(event) => setCategoryName(event.target.value)}
              />
            </div>
          )}
          {categoryError ? (
            <Alert variant="destructive">
              <AlertDescription>{categoryError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={categoryMutation.isPending} onClick={() => setCategoryAction(null)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              type="button"
              variant={categoryAction?.kind === 'delete' ? 'destructive' : 'default'}
              disabled={categoryMutation.isPending || !categoryAction || (categoryAction.kind !== 'delete' && !categoryName.trim())}
              onClick={() => { if (categoryAction) categoryMutation.mutate(categoryAction) }}
            >
              {categoryAction?.kind === 'delete' ? t('categoryManagement.delete') : t('categoryManagement.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('bulk.editTitle')}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {selectAllFiltered
              ? t('bulk.editAllDescription', { count: selectedCount })
              : t('bulk.editDescription', { count: selectedCount })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('bulk.newCategory')}</Label>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={BULK_UNCHANGED}>{t('bulk.doNotChange')}</SelectItem>
                  <SelectItem value={BULK_CLEAR}>{t('bulk.clearCategory')}</SelectItem>
                  {flattenCategoryChildren(categoriesQuery.data?.items ?? []).map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('bulk.newShop')}</Label>
              <Select value={bulkShop} onValueChange={setBulkShop}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={BULK_UNCHANGED}>{t('bulk.doNotChange')}</SelectItem>
                  <SelectItem value={BULK_CLEAR}>{t('bulk.clearShop')}</SelectItem>
                  {(shopsQuery.data?.items ?? []).map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {bulkEditError ? <Alert variant="destructive"><AlertDescription>{bulkEditError}</AlertDescription></Alert> : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={bulkEditMutation.isPending} onClick={() => setBulkEditOpen(false)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              type="button"
              disabled={bulkEditMutation.isPending || (bulkCategory === BULK_UNCHANGED && bulkShop === BULK_UNCHANGED)}
              onClick={() => bulkEditMutation.mutate()}
            >
              {t('bulk.applyChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                : confirm?.kind === 'filtered'
                  ? t('bulk.hideFilteredConfirmTitle')
                  : t('bulk.hideSelectedConfirmTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirm?.kind === 'category'
              ? t('bulk.hideCategoryConfirm', { name: confirm.name })
              : confirm?.kind === 'filtered'
                ? t('bulk.hideFilteredConfirm', { count: confirm.count })
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
