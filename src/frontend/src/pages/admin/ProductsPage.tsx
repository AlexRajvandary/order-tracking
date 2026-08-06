import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as productsApi from '@/features/products/api/productsApi'
import type { Category, Product } from '@/features/products/types'
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
import { Switch } from '@/shared/ui/switch'

const PAGE_SIZES = [20, 40, 60, 100] as const
type Density = 'comfortable' | 'dense'
type VisibilityFilter = 'all' | 'visible' | 'hidden'

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
}: {
  categories: Category[]
  selectedSlug: string | null
  onSelect: (slug: string | null) => void
}) {
  const { t } = useTranslation('products')

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
          <button
            type="button"
            className={cn(
              'w-full rounded-lg px-2 py-1.5 text-left transition-colors',
              selectedSlug === root.slug
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-foreground hover:bg-muted',
            )}
            onClick={() => onSelect(root.slug)}
          >
            {root.name}
          </button>
          {root.children.length > 0 ? (
            <ul className="ml-2 space-y-0.5 border-l pl-2">
              {root.children.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-lg px-2 py-1 text-left text-xs transition-colors',
                      selectedSlug === child.slug
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    onClick={() => onSelect(child.slug)}
                  >
                    {child.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
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
      setError(
        err instanceof ApiError ? err.message : t('edit.saveError'),
      )
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

export function ProductsPage() {
  const { t, i18n } = useTranslation('products')
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

  useEffect(() => {
    setPage(1)
  }, [activeSearch, categorySlug, visibility, pageSize])

  const categoriesQuery = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: ({ signal }) => productsApi.listCategories(signal),
  })

  const activeOnly =
    visibility === 'visible' ? true : visibility === 'hidden' ? false : null

  const productsQuery = useQuery({
    queryKey: [
      'admin-products',
      activeSearch,
      categorySlug,
      activeOnly,
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
          page,
          pageSize,
        },
        signal,
      ),
  })

  const totalPages = Math.max(
    1,
    Math.ceil((productsQuery.data?.total ?? 0) / pageSize),
  )

  const openEdit = (product: Product) => {
    setEditing(product)
    setDialogOpen(true)
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

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('categories')}</CardTitle>
          </CardHeader>
          <CardContent>
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
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex justify-end">
            <ProductsToolbarPagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
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
          ) : !(productsQuery.data?.items.length ?? 0) ? (
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
              {productsQuery.data?.items.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openEdit(product)}
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <Card
                    size="sm"
                    className="h-full gap-0 overflow-hidden pt-0 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="relative aspect-square bg-muted">
                      <img
                        src={product.imageUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="size-full object-cover"
                        loading="lazy"
                      />
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
                        {formatPrice(product.price, product.currencyCode, i18n.language)}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}

          {(productsQuery.data?.items.length ?? 0) > 0 ? (
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
    </div>
  )
}
