"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGrid, ListFilter, Rows3, ChevronDown, Check } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CatalogPagination } from "@/components/catalog-pagination";
import { CategoryTree } from "@/components/category-tree";
import type { ApiCategory } from "@/lib/categories-api";
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

function formatRub(value: number): string {
  return value.toLocaleString("ru-RU");
}

function priceStep(min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return 1;
  if (span > 50_000) return 500;
  if (span > 10_000) return 100;
  if (span > 1_000) return 10;
  return 1;
}

type CatalogBrowserProps = {
  products: CatalogProduct[];
  title: string;
  subtitle?: string;
  imageUrl?: string;
  backHref: string;
  backLabel: string;
  /** Category tree from Products API */
  categoryTree?: ApiCategory[];
  activeRootSlug?: string;
  activeChildSlug?: string;
  /** Server-side pagination (Products API). When set, `products` is the current page. */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    basePath: string;
  };
};

type FilterPanelProps = {
  priceRange: [number, number];
  setPriceRange: (value: [number, number]) => void;
  absMin: number;
  absMax: number;
  activeCount: number;
  resetFilters: () => void;
  categoryTree?: ApiCategory[];
  activeRootSlug?: string;
  activeChildSlug?: string;
};

function FilterPanel({
  priceRange,
  setPriceRange,
  absMin,
  absMax,
  activeCount,
  resetFilters,
  categoryTree,
  activeRootSlug,
  activeChildSlug,
}: FilterPanelProps) {
  const canSlide = absMax > absMin;
  const step = priceStep(absMin, absMax);

  return (
    <div className="space-y-5">
      {categoryTree && categoryTree.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Категории
          </p>
          <div className="max-h-[min(52vh,28rem)] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
            <CategoryTree
              categories={categoryTree}
              activeRootSlug={activeRootSlug}
              activeChildSlug={activeChildSlug}
            />
          </div>
        </div>
      ) : null}

      {categoryTree && categoryTree.length > 0 ? <Separator /> : null}

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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Цена, ₽
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatRub(priceRange[0])} – {formatRub(priceRange[1])}
          </p>
        </div>

        {canSlide ? (
          <Slider
            value={priceRange}
            onValueChange={(value) => {
              if (Array.isArray(value) && value.length >= 2) {
                setPriceRange([value[0], value[1]]);
              }
            }}
            min={absMin}
            max={absMax}
            step={step}
            minStepsBetweenValues={1}
            thumbCollisionBehavior="none"
            thumbAlignment="edge"
          >
            <SliderControl>
              <SliderTrack>
                <SliderIndicator />
                <SliderThumb index={0} aria-label="Цена от" />
                <SliderThumb index={1} aria-label="Цена до" />
              </SliderTrack>
            </SliderControl>
          </Slider>
        ) : (
          <p className="text-sm text-muted-foreground">
            {absMax > 0 ? `${formatRub(absMin)} ₽` : "Нет товаров для фильтра"}
          </p>
        )}
      </div>
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
  categoryTree,
  activeRootSlug,
  activeChildSlug,
  pagination,
}: CatalogBrowserProps) {
  const prices = products.map((p) => p.priceRub);
  const absMin = prices.length ? Math.min(...prices) : 0;
  const absMax = prices.length ? Math.max(...prices) : 0;
  const totalCount = pagination?.total ?? products.length;

  const [priceRange, setPriceRange] = useState<[number, number]>([absMin, absMax]);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [gridCols, setGridCols] = useState<GridCols>(3);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setPriceRange([absMin, absMax]);
  }, [absMin, absMax]);

  const filtered = useMemo(() => {
    const [min, max] = priceRange;

    let list = products.filter((p) => {
      if (p.priceRub < min || p.priceRub > max) return false;
      return true;
    });

    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.priceRub - b.priceRub);
    if (sort === "price-desc") list.sort((a, b) => b.priceRub - a.priceRub);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ru"));

    return list;
  }, [products, priceRange, sort]);

  function resetFilters() {
    setPriceRange([absMin, absMax]);
  }

  const activeCount =
    priceRange[0] > absMin || priceRange[1] < absMax ? 1 : 0;

  const filterProps: FilterPanelProps = {
    priceRange,
    setPriceRange,
    absMin,
    absMax,
    activeCount,
    resetFilters,
    categoryTree,
    activeRootSlug,
    activeChildSlug,
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

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-xl border border-[#E5E7EB] bg-white p-5 lg:sticky lg:top-20 lg:block">
          <FilterPanel {...filterProps} />
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
            <SheetTitle>Категории и фильтры</SheetTitle>
            <SheetDescription>Выберите раздел и уточните подборку</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <FilterPanel {...filterProps} />
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
