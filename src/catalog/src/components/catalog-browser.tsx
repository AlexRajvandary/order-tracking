"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import type { ApiBrand } from "@/lib/brands-api";
import type { ApiCategory } from "@/lib/categories-api";
import type { CatalogProduct } from "@/lib/catalog-products";
import type { ApiShop, ProductConditionFilter } from "@/lib/shops-api";
import { cn } from "@/lib/utils";

type SortOption = "relevance" | "price-asc" | "price-desc" | "name";
/** dense: 2 cols mobile / 4 desktop; comfortable: 1 col mobile / 3 desktop */
type GridDensity = "dense" | "comfortable";

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
  brands?: ApiBrand[];
  selectedBrandSlugs?: string[];
  shops?: ApiShop[];
  selectedShopSlugs?: string[];
  selectedConditions?: ProductConditionFilter[];
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
  brands?: ApiBrand[];
  selectedBrandSlugs: string[];
  onToggleBrand: (slug: string) => void;
  shops?: ApiShop[];
  selectedShopSlugs: string[];
  onToggleShop: (slug: string) => void;
  selectedConditions: ProductConditionFilter[];
  onToggleCondition: (value: ProductConditionFilter) => void;
};

const CONDITION_OPTIONS: Array<{ value: ProductConditionFilter; label: string }> = [
  { value: "new", label: "Новое" },
  { value: "used", label: "Б/У" },
];

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
  brands,
  selectedBrandSlugs,
  onToggleBrand,
  shops,
  selectedShopSlugs,
  onToggleShop,
  selectedConditions,
  onToggleCondition,
}: FilterPanelProps) {
  const canSlide = absMax > absMin;
  const step = priceStep(absMin, absMax);
  const selectedBrands = new Set(selectedBrandSlugs);
  const selectedShops = new Set(selectedShopSlugs);
  const selectedCond = new Set(selectedConditions);

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

      <div className="space-y-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Состояние
        </p>
        <div className="flex flex-col gap-0.5">
          {CONDITION_OPTIONS.map((opt) => {
            const checked = selectedCond.has(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition",
                  checked ? "bg-[#F3F4F6] font-medium" : "hover:bg-[#F3F4F6]",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleCondition(opt.value)}
                  className="size-4 accent-[#111827]"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {shops && shops.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Магазин
          </p>
          <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
            {shops.map((shop) => {
              const checked = selectedShops.has(shop.slug);
              return (
                <label
                  key={shop.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition",
                    checked ? "bg-[#F3F4F6] font-medium" : "hover:bg-[#F3F4F6]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleShop(shop.slug)}
                    className="size-4 accent-[#111827]"
                  />
                  <span className="truncate">{shop.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {brands && brands.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Бренд
          </p>
          <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
            {brands.map((brand) => {
              const checked = selectedBrands.has(brand.slug);
              return (
                <label
                  key={brand.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition",
                    checked ? "bg-[#F3F4F6] font-medium" : "hover:bg-[#F3F4F6]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleBrand(brand.slug)}
                    className="size-4 accent-[#111827]"
                  />
                  <span className="truncate">{brand.name}</span>
                </label>
              );
            })}
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
  categoryTree,
  activeRootSlug,
  activeChildSlug,
  brands,
  selectedBrandSlugs = [],
  shops,
  selectedShopSlugs = [],
  selectedConditions = [],
  pagination,
}: CatalogBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const prices = products.map((p) => p.priceRub);
  const absMin = prices.length ? Math.min(...prices) : 0;
  const absMax = prices.length ? Math.max(...prices) : 0;
  const totalCount = pagination?.total ?? products.length;

  const [priceRange, setPriceRange] = useState<[number, number]>([absMin, absMax]);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [gridDensity, setGridDensity] = useState<GridDensity>("dense");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setPriceRange([absMin, absMax]);
  }, [absMin, absMax]);

  function replaceQuery(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleCsvParam(key: string, value: string) {
    replaceQuery((params) => {
      const current = (params.get(key) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const next = current.includes(value)
        ? current.filter((s) => s !== value)
        : [...current, value];
      if (next.length > 0) params.set(key, next.join(","));
      else params.delete(key);
      params.delete("page");
    });
  }

  function onToggleBrand(slug: string) {
    toggleCsvParam("brands", slug);
  }

  function onToggleShop(slug: string) {
    toggleCsvParam("shops", slug);
  }

  function onToggleCondition(value: ProductConditionFilter) {
    toggleCsvParam("condition", value);
  }

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
    const hasQueryFilters =
      selectedBrandSlugs.length > 0 ||
      selectedShopSlugs.length > 0 ||
      selectedConditions.length > 0;
    if (hasQueryFilters) {
      replaceQuery((params) => {
        params.delete("brands");
        params.delete("shops");
        params.delete("condition");
        params.delete("page");
      });
    }
  }

  const priceActive = priceRange[0] > absMin || priceRange[1] < absMax;
  const activeCount =
    (priceActive ? 1 : 0) +
    (selectedBrandSlugs.length > 0 ? 1 : 0) +
    (selectedShopSlugs.length > 0 ? 1 : 0) +
    (selectedConditions.length > 0 ? 1 : 0);

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
    brands,
    selectedBrandSlugs,
    onToggleBrand,
    shops,
    selectedShopSlugs,
    onToggleShop,
    selectedConditions,
    onToggleCondition,
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
                className="flex items-center rounded-lg border border-[#E5E7EB] p-0.5"
                role="group"
                aria-label="Сетка товаров"
              >
                <button
                  type="button"
                  aria-label="Плотная сетка"
                  aria-pressed={gridDensity === "dense"}
                  title="Плотная сетка"
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md transition",
                    gridDensity === "dense"
                      ? "bg-[#111827] text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => setGridDensity("dense")}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Крупные карточки"
                  aria-pressed={gridDensity === "comfortable"}
                  title="Крупные карточки"
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md transition",
                    gridDensity === "comfortable"
                      ? "bg-[#111827] text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => setGridDensity("comfortable")}
                >
                  <Rows3 className="size-4" />
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
              {pagination ? (
                <CatalogPagination
                  page={pagination.page}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  basePath={pagination.basePath}
                />
              ) : null}
              <div
                className={cn(
                  "grid gap-4",
                  gridDensity === "dense"
                    ? "grid-cols-2 lg:grid-cols-4"
                    : "grid-cols-1 lg:grid-cols-3",
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
