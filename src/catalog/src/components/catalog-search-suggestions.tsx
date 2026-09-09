"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import type { ApiCategory } from "@/lib/categories-api";
import { categoryHref } from "@/lib/categories-api";
import { mapApiProductToCatalog, mapRakutenProductToCatalog, type ApiExternalProduct, type ApiProduct } from "@/lib/products-api";
import { formatPrice } from "@/lib/products";

type Suggestions = { localProducts: ApiProduct[]; rakutenProducts: ApiExternalProduct[]; localTotal: number; rakutenTotal: number };

export function CatalogSearchSuggestions({ categories, value, onChange, onNavigate }: {
  categories: ApiCategory[]; value: string; onChange: (value: string) => void; onNavigate?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>({ localProducts: [], rakutenProducts: [], localTotal: 0, rakutenTotal: 0 });
  const normalized = value.trim().toLocaleLowerCase("ru-RU");
  const categoryMatches = useMemo(() => categories.flatMap(category => {
    const entries = category.name.toLocaleLowerCase("ru-RU").includes(normalized) ? [{ name: category.name, href: categoryHref(category.slug), count: category.productCount }] : [];
    return [...entries, ...category.children.filter(child => child.name.toLocaleLowerCase("ru-RU").includes(normalized)).map(child => ({ name: child.name, href: categoryHref(category.slug, child.slug), count: child.productCount }))];
  }).slice(0, 6), [categories, normalized]);

  useEffect(() => {
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try { const response = await fetch(`/api/catalog-search-suggestions?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal });
        if (!response.ok) throw new Error(); setSuggestions(await response.json() as Suggestions); }
      catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions({ localProducts: [], rakutenProducts: [], localTotal: 0, rakutenTotal: 0 }); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalized, value]);

  useEffect(() => { const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, []);

  const hasResults = categoryMatches.length + suggestions.localProducts.length + suggestions.rakutenProducts.length > 0;
  return <div ref={root} className="relative z-[100] mb-3 w-full min-[992px]:w-[200%]">
    <label className="relative block"><span className="sr-only">Поиск по каталогу</span>
      <input type="search" value={value} placeholder="Категории и товары" autoComplete="off"
        className="h-9 w-full rounded-md border border-[#D1D5DB] bg-transparent px-3 pr-9 text-sm text-[#1F2937] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#9CA3AF]"
        onFocus={() => setOpen(true)} onChange={event => { onChange(event.target.value); setOpen(true); if (event.target.value.trim().length < 2) setLoading(false); }} />
      {loading ? <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-[#9CA3AF]" />
        : <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#9CA3AF]" />}
    </label>
    {open && normalized.length >= 2 ? <div className="absolute top-full left-0 z-[110] mt-2 w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-2xl">
      {!loading && !hasResults ? <p className="p-5 text-sm text-muted-foreground">Ничего не найдено</p> : <div className="max-h-[70vh] overflow-y-auto p-4">
        {categoryMatches.length ? <section><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Категории</h3>
          <div className="grid gap-1 sm:grid-cols-2">{categoryMatches.map(item => <Link key={item.href} href={item.href} onClick={onNavigate} className="flex justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"><span>{item.name}</span><span className="text-muted-foreground">{item.count}</span></Link>)}</div></section> : null}
        {suggestions.localProducts.length ? <section className="mt-4 border-t pt-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Товары TheGet <span className="font-normal tabular-nums">({suggestions.localTotal.toLocaleString("ru-RU")})</span></h3>
          <div className="grid gap-2 sm:grid-cols-2">{suggestions.localProducts.map(raw => { const product = mapApiProductToCatalog(raw); return <Link key={product.id} href={`/products/${product.id}`} onClick={onNavigate} className="flex gap-3 rounded-lg p-2 hover:bg-muted">{product.imageUrl ? <img src={product.imageUrl} alt="" className="size-14 shrink-0 object-cover" /> : <div className="size-14 shrink-0 bg-muted" />}<span className="min-w-0"><span className="line-clamp-2 text-sm font-medium">{product.name}</span><span className="text-sm font-semibold">{formatPrice(product)}</span></span></Link>; })}</div></section> : null}
        {suggestions.rakutenProducts.length ? <section className="mt-4 border-t pt-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Товары Rakuten <span className="font-normal tabular-nums">({suggestions.rakutenTotal.toLocaleString("ru-RU")})</span></h3><Link href={`/rakuten?query=${encodeURIComponent(value.trim())}`} onClick={onNavigate} className="text-sm font-medium text-primary hover:underline">Смотреть всё</Link></div>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">{suggestions.rakutenProducts.slice(0, 10).map(raw => { const product = mapRakutenProductToCatalog(raw); return <a key={product.id} href={product.affiliateUrl || product.sourceUrl} target="_blank" rel="noreferrer" className="w-32 shrink-0 snap-start"><div className="aspect-square overflow-hidden bg-muted">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : null}</div><p className="mt-1 line-clamp-2 text-xs font-medium">{product.name}</p><p className="text-xs font-semibold">{formatPrice(product)}</p></a>; })}</div></section> : null}
      </div>}
    </div> : null}
  </div>;
}
