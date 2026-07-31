"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { CatalogProduct } from "@/lib/catalog-products";
import { cn } from "@/lib/utils";

type SortOption = "relevance" | "price-asc" | "price-desc" | "name";

type CatalogBrowserProps = {
  products: CatalogProduct[];
  title: string;
  subtitle?: string;
  imageUrl?: string;
  backHref: string;
  backLabel: string;
  /** Show subcategory filter chips when browsing a whole section */
  subcategoryOptions?: Array<{ slug: string; label: string }>;
};

export function CatalogBrowser({
  products,
  title,
  subtitle,
  imageUrl,
  backHref,
  backLabel,
  subcategoryOptions,
}: CatalogBrowserProps) {
  const prices = products.map((p) => p.priceRub);
  const absMin = prices.length ? Math.min(...prices) : 0;
  const absMax = prices.length ? Math.max(...prices) : 0;

  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [subcategory, setSubcategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

    let list = products.filter((p) => {
      if (subcategory !== "all" && p.categorySlug !== subcategory) return false;
      if (inStockOnly && !p.inStock) return false;
      if (min != null && !Number.isNaN(min) && p.priceRub < min) return false;
      if (max != null && !Number.isNaN(max) && p.priceRub > max) return false;
      if (q) {
        const hay = `${p.name} ${p.shortDescription} ${p.category} ${p.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.priceRub - b.priceRub);
    if (sort === "price-desc") list.sort((a, b) => b.priceRub - a.priceRub);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ru"));

    return list;
  }, [products, query, minPrice, maxPrice, inStockOnly, sort, subcategory]);

  function resetFilters() {
    setQuery("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setSort("relevance");
    setSubcategory("all");
  }

  const activeCount = [
    query.trim() ? 1 : 0,
    minPrice ? 1 : 0,
    maxPrice ? 1 : 0,
    inStockOnly ? 1 : 0,
    sort !== "relevance" ? 1 : 0,
    subcategory !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" render={<Link href={backHref} />}>
        ← {backLabel}
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {imageUrl ? (
          <div className="flex size-20 shrink-0 items-center justify-center border bg-muted/40 p-2 sm:size-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          <p className="mt-2 text-sm text-muted-foreground">
            Показано {filtered.length} из {products.length}
            {activeCount > 0 ? (
              <Badge variant="secondary" className="ml-2 align-middle">
                фильтров: {activeCount}
              </Badge>
            ) : null}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit space-y-4 border bg-card p-4 lg:sticky lg:top-20">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Фильтры</h2>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={activeCount === 0}
              onClick={resetFilters}
            >
              Сбросить
            </Button>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <label htmlFor="catalog-search" className="text-xs font-medium text-muted-foreground">
              Поиск
            </label>
            <Input
              id="catalog-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Название, тег…"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Цена, ₽</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                inputMode="numeric"
                placeholder={`${absMin}`}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/[^\d]/g, ""))}
                aria-label="Цена от"
              />
              <Input
                inputMode="numeric"
                placeholder={`${absMax}`}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
                aria-label="Цена до"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="catalog-sort" className="text-xs font-medium text-muted-foreground">
              Сортировка
            </label>
            <select
              id="catalog-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className={cn(
                "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
            >
              <option value="relevance">По умолчанию</option>
              <option value="price-asc">Цена ↑</option>
              <option value="price-desc">Цена ↓</option>
              <option value="name">По названию</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="size-4 accent-foreground"
            />
            Только в наличии
          </label>

          {subcategoryOptions && subcategoryOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Подкатегория</p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant={subcategory === "all" ? "default" : "outline"}
                  onClick={() => setSubcategory("all")}
                >
                  Все
                </Button>
                {subcategoryOptions.map((opt) => (
                  <Button
                    key={opt.slug}
                    type="button"
                    size="xs"
                    variant={subcategory === opt.slug ? "default" : "outline"}
                    onClick={() => setSubcategory(opt.slug)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <div>
          {filtered.length === 0 ? (
            <div className="border bg-card px-6 py-16 text-center">
              <p className="font-medium">Ничего не найдено</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Попробуйте сбросить фильтры или изменить запрос.
              </p>
              <Button type="button" className="mt-4" variant="outline" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
