import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as productsApi from '@/features/products/api/productsApi'
import type { Category, Shop, UpdateProductRequest } from '@/features/products/types'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import { Textarea } from '@/shared/ui/textarea'

const NONE = '__none__'
function flatten(categories: Category[], depth = 0): Array<{ id: string; name: string }> {
  return categories.flatMap((c) => [{ id: c.id, name: `${'— '.repeat(depth)}${c.name}` }, ...flatten(c.children, depth + 1)])
}

export function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('products')
  const queryClient = useQueryClient()
  const productQuery = useQuery({
    queryKey: ['admin-product', id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => productsApi.getProduct(id!, signal),
  })
  const categoriesQuery = useQuery({ queryKey: ['admin-product-categories'], queryFn: ({ signal }) => productsApi.listCategories(null, signal) })
  const shopsQuery = useQuery({ queryKey: ['admin-product-shops'], queryFn: ({ signal }) => productsApi.listShops(signal) })
  const [form, setForm] = useState<UpdateProductRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const p = productQuery.data
    if (p) setForm({ name: p.name, nameRu: p.nameRu, slug: p.slug, description: p.description, sku: p.sku, brand: p.brand, brandId: p.brandId, price: p.price, currencyCode: p.currencyCode, originalPrice: p.originalPrice, originalCurrencyCode: p.originalCurrencyCode, imageUrl: p.imageUrl, sourceUrl: p.sourceUrl, isActive: p.isActive, condition: p.condition, shopId: p.shopId, categoryId: p.categoryId })
  }, [productQuery.data])
  const categoryOptions = useMemo(() => flatten(categoriesQuery.data?.items ?? []), [categoriesQuery.data])
  const mutation = useMutation({
    mutationFn: () => {
      if (!id || !form) throw new Error('Missing product')
      return productsApi.updateProduct(id, form)
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setError(null) },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : t('edit.saveError')),
  })
  if (productQuery.isLoading || !form) return <p className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</p>
  if (productQuery.isError) return <Alert variant="destructive"><AlertDescription>{t('error', { ns: 'common' })}</AlertDescription></Alert>
  const set = (key: keyof UpdateProductRequest, value: unknown) => setForm((f) => f ? { ...f, [key]: value } : f)
  return <div className="space-y-6">
    <Button variant="ghost" onClick={() => navigate('/admin/products')}><ArrowLeft />{t('back', { ns: 'common' })}</Button>
    <div><h1 className="text-2xl font-bold">{form.name}</h1><p className="text-sm text-muted-foreground">ID: {id}</p></div>
    <Card><CardHeader><CardTitle>{t('edit.title')}</CardTitle></CardHeader><CardContent>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-1.5"><Label>{t('edit.name')}</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} required /></div><div className="space-y-1.5"><Label>Slug</Label><Input value={form.slug ?? ''} onChange={(e) => set('slug', e.target.value)} /></div></div>
        <div className="grid gap-4 md:grid-cols-4"><div className="space-y-1.5"><Label>{t('edit.price')}</Label><Input type="number" value={form.price} onChange={(e) => set('price', Number(e.target.value))} /></div><div className="space-y-1.5"><Label>{t('edit.originalPrice')}</Label><Input type="number" value={form.originalPrice ?? ''} onChange={(e) => set('originalPrice', e.target.value ? Number(e.target.value) : null)} /></div><div className="space-y-1.5"><Label>Валюта</Label><Input value={form.currencyCode ?? ''} onChange={(e) => set('currencyCode', e.target.value.toUpperCase())} maxLength={3} /></div><div className="space-y-1.5"><Label>SKU</Label><Input value={form.sku ?? ''} onChange={(e) => set('sku', e.target.value)} /></div></div>
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-1.5"><Label>{t('edit.category')}</Label><Select value={form.categoryId ?? NONE} onValueChange={(v) => set('categoryId', v === NONE ? null : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>{t('edit.noCategory')}</SelectItem>{categoryOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>{t('edit.shop')}</Label><Select value={form.shopId ?? NONE} onValueChange={(v) => set('shopId', v === NONE ? null : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>{t('edit.noShop')}</SelectItem>{(shopsQuery.data?.items ?? []).map((s: Shop) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div></div>
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-1.5"><Label>Бренд</Label><Input value={form.brand ?? ''} onChange={(e) => set('brand', e.target.value)} /></div><div className="space-y-1.5"><Label>Ссылка на источник</Label><Input value={form.sourceUrl ?? ''} onChange={(e) => set('sourceUrl', e.target.value)} /></div></div>
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-1.5"><Label>Состояние</Label><Select value={form.condition ?? 'new'} onValueChange={(v) => set('condition', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Новый</SelectItem><SelectItem value="used">Б/У</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label>Валюта оригинала</Label><Input value={form.originalCurrencyCode ?? ''} onChange={(e) => set('originalCurrencyCode', e.target.value.toUpperCase())} maxLength={3} /></div></div>
        <div className="space-y-1.5"><Label>Описание</Label><Textarea rows={5} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Изображение</Label><Input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} /></div>
        <div className="flex items-center justify-between rounded-lg border px-3 py-2"><Label>{t('edit.inCatalog')}</Label><Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} /></div>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <div className="flex justify-end"><Button type="submit" disabled={mutation.isPending}>{t('save', { ns: 'common' })}</Button></div>
      </form>
    </CardContent></Card>
  </div>
}
