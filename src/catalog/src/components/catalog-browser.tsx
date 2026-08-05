"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGrid, ListFilter, Rows3, ChevronDown, Check } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CatalogPagination } from "@/components/catalog-pagination";
import type { CatalogProduct } from "@/lib/catalog-products";
import { cn } from "@/lib/utils";

type SortOption = "relevance" | "price-asc" | "price-desc" | "name";
type GridCols = 3 | 4;

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "relevance", label: "По умолчанию" },
  { value: "price-asc", label: "Цена: по возрастанию" },
  { value: "price-desc", label: "Цена: по убыванию" },
  { value: "name", label: "По названию" },
];

type CatalogBrowserProps = {
  products: CatalogProduct[];
  title: string;
  subtitle?: string;
  imageUrl?: string;
  backHref: string;
  backLabel: string;
  /** Show subcategory filter chips when browsing a whole section */
  subcategoryOptions?: Array<{ slug: string; label: string }>;
  /** Server-side pagination (Products API). When set, `products` is the current page. */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    basePath: string;
  };
};

type FilterPanelProps = {
  query: string;
  setQuery: (value: string) => void;
  minPrice: string;
  setMinPrice: (value: string) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
  inStockOnly: boolean;
  setInStockOnly: (value: boolean) => void;
  subcategory: string;
  setSubcategory: (value: string) => void;
  absMin: number;
  absMax: number;
  activeCount: number;
  resetFilters: () => void;
  subcategoryOptions?: Array<{ slug: string; label: string }>;
  idPrefix: string;
};

function FilterPanel({
  query,
  setQuery,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  inStockOnly,
  setInStockOnly,
  subcategory,
  setSubcategory,
  absMin,
  absMax,
  activeCount,
  resetFilters,
  subcategoryOptions,
  idPrefix,
}: FilterPanelProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">Фильтры</h2>
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

      <div className="space-y-2">
        <label
          htmlFor={`${idPrefix}-search`}
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Поиск
        </label>
        <Input
          id={`${idPrefix}-search`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название, тег…"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Цена, ₽
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            inputMode="numeric"
            placeholder={`от ${absMin}`}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value.replace(/[^\d]/g, ""))}
            aria-label="Цена от"
          />
          <Input
            inputMode="numeric"
            placeholder={`до ${absMax}`}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
            aria-label="Цена до"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-1 py-1 text-sm transition hover:bg-muted/50">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
          className="size-4 accent-foreground"
        />
        Только в наличии
      </label>

      {subcategoryOptions && subcategoryOptions.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Подкатегория
          </p>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setSubcategory("all")}
              className={cn(
                "rounded-md px-2.5 py-2 text-left text-sm transition",
                subcategory === "all"
                  ? "bg-[#111827] font-medium text-white"
                  : "text-foreground hover:bg-muted",
              )}
            >
              Все
            </button>
            {subcategoryOptions.map((opt) => (
              <button
                key={opt.slug}
                type="button"
                onClick={() => setSubcategory(opt.slug)}
                className={cn(
                  "rounded-md px-2.5 py-2 text-left text-sm transition",
                  subcategory === opt.slug
                    ? "bg-[#111827] font-medium text-white"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="min-w-[11.5rem] justify-between gap-2"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">{current.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 opacity-60 transition", open && "rotate-180")} />
      </Button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Сортировка"
          className="absolute right-0 z-30 mt-1.5 min-w-[14rem] overflow-hidden rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg"
        >
          {SORT_OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition",
                    selected ? "bg-muted font-medium" : "hover:bg-muted/70",
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  {selected ? <Check className="size-4 shrink-0" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function CatalogBrowser({
  products,
  title,
  subtitle,
  imageUrl,
  backHref,
  backLabel,
  subcategoryOptions,
  pagination,
}: CatalogBrowserProps) {
  const prices = products.map((p) => p.priceRub);
  const absMin = prices.length ? Math.min(...prices) : 0;
  const absMax = prices.length ? Math.max(...prices) : 0;
  const totalCount = pagination?.total ?? products.length;

  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [subcategory, setSubcategory] = useState<string>("all");
  const [gridCols, setGridCols] = useState<GridCols>(3);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
    setSubcategory("all");
  }

  const activeCount = [
    query.trim() ? 1 : 0,
    minPrice ? 1 : 0,
    maxPrice ? 1 : 0,
    inStockOnly ? 1 : 0,
    subcategory !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const filterProps: Omit<FilterPanelProps, "idPrefix"> = {
    query,
    setQuery,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    inStockOnly,
    setInStockOnly,
    subcategory,
    setSubcategory,
    absMin,
    absMax,
    activeCount,
    resetFilters,
    subcategoryOptions,
  };

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
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-xl border border-[#E5E7EB] bg-white p-5 lg:sticky lg:top-20 lg:block">
          <FilterPanel {...filterProps} idPrefix="desktop" />
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <ListFilter className="size-4" />
                Фильтры
                {activeCount > 0 ? (
                  <Badge variant="secondary" className="ml-0.5">
                    {activeCount}
                  </Badge>
                ) : null}
              </Button>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{filtered.length}</span>
                {" из "}
                {totalCount}
                {pagination ? (
                  <span className="text-muted-foreground">
                    {" · стр. "}
                    {pagination.page}
                  </span>
                ) : null}
                {activeCount > 0 ? (
                  <Badge variant="secondary" className="ml-2 align-middle">
                    фильтров: {activeCount}
                  </Badge>
                ) : null}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div
                className="hidden items-center rounded-lg border border-[#E5E7EB] p-0.5 sm:flex"
                role="group"
                aria-label="Сетка товаров"
              >
                <button
                  type="button"
                  aria-label="3 колонки"
                  aria-pressed={gridCols === 3}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md transition",
                    gridCols === 3
                      ? "bg-[#111827] text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => setGridCols(3)}
                >
                  <Rows3 className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="4 колонки"
                  aria-pressed={gridCols === 4}
                  className={cn(
                    "hidden size-8 items-center justify-center rounded-md transition 2xl:flex",
                    gridCols === 4
                      ? "bg-[#111827] text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => setGridCols(4)}
                >
                  <LayoutGrid className="size-4" />
                </button>
              </div>

              <SortDropdown value={sort} onChange={setSort} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-16 text-center">
              <p className="font-medium">Ничего не найдено</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Попробуйте сбросить фильтры или изменить запрос.
              </p>
              <Button type="button" className="mt-4" variant="outline" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div
                className={cn(
                  "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
                  gridCols === 4 && "2xl:grid-cols-4",
                )}
              >
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {pagination ? (
                <CatalogPagination
                  page={pagination.page}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  basePath={pagination.basePath}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="left" className="w-[min(100%,20rem)] gap-0 p-0">
          <SheetHeader className="border-b border-[#E5E7EB]">
            <SheetTitle>Фильтры</SheetTitle>
            <SheetDescription>Уточните подборку товаров</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <FilterPanel {...filterProps} idPrefix="mobile" />
          </div>
          <div className="mt-auto border-t border-[#E5E7EB] p-4">
            <Button
              type="button"
              className="w-full"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Показать {filtered.length}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
