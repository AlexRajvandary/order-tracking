"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryHref, type ApiCategory } from "@/lib/categories-api";
import { mapApiProductToCatalog, mapRakutenProductToCatalog, type ApiExternalProduct, type ApiProduct } from "@/lib/products-api";
import { formatPrice } from "@/lib/products";

type Suggestions = { localProducts: ApiProduct[]; rakutenProducts: ApiExternalProduct[]; localTotal: number; rakutenTotal: number };
const EMPTY: Suggestions = { localProducts: [], rakutenProducts: [], localTotal: 0, rakutenTotal: 0 };

function EmptySection() {
  return <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Не найдено</p>;
}

function CategorySkeletons() {
  return <div className="grid gap-1 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="flex h-9 items-center justify-between px-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-8" /></div>)}</div>;
}

function ProductSkeletons() {
  return <div className="grid gap-2 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="flex h-[72px] gap-3 p-2"><Skeleton className="size-14 shrink-0 rounded-none" /><div className="min-w-0 flex-1 space-y-2 pt-1"><Skeleton className="h-3.5 w-11/12" /><Skeleton className="h-3.5 w-3/5" /><Skeleton className="h-4 w-2/5" /></div></div>)}</div>;
}

function RakutenSkeletons() {
  return <div className="flex gap-3 overflow-hidden pb-2">{Array.from({ length: 5 }, (_, index) => <div key={index} className="w-32 shrink-0"><Skeleton className="aspect-square w-full rounded-none" /><Skeleton className="mt-2 h-3 w-11/12" /><Skeleton className="mt-1.5 h-3 w-1/2" /></div>)}</div>;
}

export function CatalogSearchSuggestions({ categories, value, onChange, onNavigate, onActiveChange }: {
  categories: ApiCategory[]; value: string; onChange: (value: string) => void; onNavigate?: () => void;
  onActiveChange?: (active: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>(EMPTY);
  const normalized = value.trim().toLocaleLowerCase("ru-RU");
  const categoryMatches = useMemo(() => categories.flatMap(category => {
    const entries = category.name.toLocaleLowerCase("ru-RU").includes(normalized) ? [{ name: category.name, href: categoryHref(category.slug), count: category.productCount }] : [];
    return [...entries, ...category.children.filter(child => child.name.toLocaleLowerCase("ru-RU").includes(normalized)).map(child => ({ name: child.name, href: categoryHref(category.slug, child.slug), count: child.productCount }))];
  }).slice(0, 6), [categories, normalized]);

  useEffect(() => {
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/catalog-search-suggestions?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        setSuggestions(await response.json() as Suggestions);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions(EMPTY);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalized, value]);

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(false); onActiveChange?.(false); } };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [onActiveChange]);

  return <div ref={root} className={`relative z-[100] mb-3 w-full min-[992px]:w-[200%] ${open ? "max-[991px]:flex max-[991px]:h-full max-[991px]:min-h-0 max-[991px]:flex-col" : ""}`}>
    <label className="relative block"><span className="sr-only">Поиск по каталогу</span>
      <input type="search" value={value} placeholder="Категории и товары" autoComplete="off"
        className="h-9 w-full rounded-md border border-[#D1D5DB] bg-transparent px-3 pr-9 text-sm text-[#1F2937] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#9CA3AF]"
        onFocus={() => { setOpen(true); onActiveChange?.(true); }} onChange={event => { const searchable = event.target.value.trim().length >= 2; onChange(event.target.value); setOpen(true); setLoading(searchable); }} />
      {loading ? <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-[#9CA3AF]" /> : <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#9CA3AF]" />}
    </label>
    {open && normalized.length >= 2 ? <div className="relative z-[110] mt-2 w-full overflow-hidden rounded-xl border-0 border-[#E5E7EB] bg-white shadow-none max-[991px]:min-h-0 max-[991px]:flex-1 min-[992px]:absolute min-[992px]:top-full min-[992px]:left-0 min-[992px]:w-[min(760px,calc(100vw-2rem))] min-[992px]:border min-[992px]:shadow-2xl">
      <div className="h-full max-h-[70vh] overflow-y-auto p-4 max-[991px]:max-h-none">
        <section className="flex flex-col min-[992px]:min-h-[140px]"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Категории</h3>
          {loading ? <CategorySkeletons /> : categoryMatches.length ? <div className="grid gap-1 sm:grid-cols-2">{categoryMatches.map(item => <Link key={item.href} href={item.href} onClick={onNavigate} className="flex justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"><span>{item.name}</span><span className="text-muted-foreground">{item.count}</span></Link>)}</div> : <EmptySection />}
        </section>
        <section className="mt-4 flex flex-col border-t pt-4 min-[992px]:min-h-[260px]"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Товары TheGet {!loading ? <span className="font-normal tabular-nums">({suggestions.localTotal.toLocaleString("ru-RU")})</span> : null}</h3>
          {loading ? <ProductSkeletons /> : suggestions.localProducts.length ? <div className="grid gap-2 sm:grid-cols-2">{suggestions.localProducts.map(raw => { const product = mapApiProductToCatalog(raw); return <Link key={product.id} href={`/products/${product.id}`} onClick={onNavigate} className="flex gap-3 rounded-lg p-2 hover:bg-muted">{product.imageUrl ? <img src={product.imageUrl} alt="" className="size-14 shrink-0 object-cover" /> : <div className="size-14 shrink-0 bg-muted" />}<span className="min-w-0"><span className="line-clamp-2 text-sm font-medium">{product.name}</span><span className="text-sm font-semibold">{formatPrice(product)}</span></span></Link>; })}</div> : <EmptySection />}
        </section>
        <section className="mt-4 flex flex-col border-t pt-4 min-[992px]:min-h-[190px]"><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Товары Rakuten {!loading ? <span className="font-normal tabular-nums">({suggestions.rakutenTotal.toLocaleString("ru-RU")})</span> : null}</h3>{!loading && suggestions.rakutenProducts.length ? <Link href={`/rakuten?query=${encodeURIComponent(value.trim())}`} onClick={onNavigate} className="text-sm font-medium text-primary hover:underline">Смотреть всё</Link> : null}</div>
          {loading ? <RakutenSkeletons /> : suggestions.rakutenProducts.length ? <div className="flex snap-x gap-3 overflow-x-auto pb-2">{suggestions.rakutenProducts.slice(0, 10).map(raw => { const product = mapRakutenProductToCatalog(raw); return <Link key={product.id} href={`/products/rakuten~${encodeURIComponent(product.externalId ?? "")}`} onClick={onNavigate} className="w-32 shrink-0 snap-start"><div className="aspect-square overflow-hidden bg-muted">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : null}</div><p className="mt-1 line-clamp-2 text-xs font-medium">{product.name}</p><p className="text-xs font-semibold">{formatPrice(product)}</p></Link>; })}</div> : <EmptySection />}
        </section>
      </div>
    </div> : null}
  </div>;
}
