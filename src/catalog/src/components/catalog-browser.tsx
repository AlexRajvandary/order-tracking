"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Check, ChevronDown, ListTree } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  mapApiProductToCatalog,
  type ApiProductListResult,
} from "@/lib/products-api";
import type { ApiShop } from "@/lib/shops-api";
import { cn } from "@/lib/utils";

type SortOption = "relevance" | "price-asc" | "price-desc" | "name";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "relevance", label: "По умолчанию" },
  { value: "price-asc", label: "Цена: по возрастанию" },
  { value: "price-desc", label: "Цена: по убыванию" },
  { value: "name", label: "По названию" },
];

type CatalogBrowserProps = {
  products: CatalogProduct[];
  title: string;
  parentBreadcrumb?: {
    label: string;
    href: string;
  };
  /** Category tree from Products API */
  categoryTree?: ApiCategory[];
  activeRootSlug?: string;
  activeChildSlug?: string;
  brands?: ApiBrand[];
  selectedBrandSlugs?: string[];
  shops?: ApiShop[];
  selectedShopSlugs?: string[];
  /** Server-side pagination (Products API). When set, `products` is the current page. */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    basePath: string;
  };
};

function FilterDropdown({
  label,
  activeCount = 0,
  children,
}: {
  label: string;
  activeCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const contentId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        {activeCount > 0 ? (
          <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 tabular-nums">
            {activeCount}
          </Badge>
        ) : null}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </Button>
      {open ? (
        <div
          id={contentId}
          className="absolute right-0 z-30 mt-1.5 w-64 rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MultiSelectFilter({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Array<{ id: string; slug: string; name: string }>;
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  const selectedSet = new Set(selected);

  return (
    <FilterDropdown label={label} activeCount={selected.length}>
      <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {options.length > 0 ? (
          options.map((option) => {
            const checked = selectedSet.has(option.slug);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition",
                  checked ? "bg-muted font-medium" : "hover:bg-muted",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(option.slug)}
                  className="size-4 accent-[#111827]"
                />
                <span className="truncate">{option.name}</span>
              </label>
            );
          })
        ) : (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Нет вариантов</p>
        )}
      </div>
    </FilterDropdown>
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
        size="icon-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Сортировка: ${current.label}`}
        title={current.label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <ArrowUpDown className="size-4" />
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
  parentBreadcrumb,
  categoryTree,
  activeRootSlug,
  activeChildSlug,
  brands,
  selectedBrandSlugs = [],
  shops,
  selectedShopSlugs = [],
  pagination,
}: CatalogBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const prices = products.map((p) => p.priceRub);
  const absMin = prices.length ? Math.min(...prices) : 0;
  const absMax = prices.length ? Math.max(...prices) : 0;
  const totalCount = pagination?.total ?? products.length;
  const allCategoriesProductCount = (categoryTree ?? []).reduce(
    (sum, category) => sum + category.productCount,
    0,
  );

  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const mobileDatasetKey = [
    pathname,
    activeRootSlug ?? "all",
    activeChildSlug ?? "",
    selectedBrandSlugs.join(","),
    selectedShopSlugs.join(","),
    pagination?.page ?? 1,
  ].join("|");
  const [mobilePages, setMobilePages] = useState<{
    key: string;
    products: CatalogProduct[];
    loadedPage: number;
  }>({ key: mobileDatasetKey, products: [], loadedPage: pagination?.page ?? 1 });
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileLoadError, setMobileLoadError] = useState(false);
  const activeMobilePages =
    mobilePages.key === mobileDatasetKey
      ? mobilePages
      : { key: mobileDatasetKey, products: [], loadedPage: pagination?.page ?? 1 };

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

  const filterAndSort = useCallback((items: CatalogProduct[]) => {
    const parsedMin = Number(priceFrom);
    const parsedMax = Number(priceTo);
    const min = priceFrom.trim() && Number.isFinite(parsedMin) ? parsedMin : null;
    const max = priceTo.trim() && Number.isFinite(parsedMax) ? parsedMax : null;

    let list = items.filter((p) => {
      if (min != null && p.priceRub < min) return false;
      if (max != null && p.priceRub > max) return false;
      return true;
    });

    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.priceRub - b.priceRub);
    if (sort === "price-desc") list.sort((a, b) => b.priceRub - a.priceRub);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ru"));

    return list;
  }, [priceFrom, priceTo, sort]);

  const filtered = useMemo(
    () => filterAndSort(products),
    [products, filterAndSort],
  );
  const mobileProducts = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    activeMobilePages.products.forEach((product) => byId.set(product.id, product));
    return filterAndSort([...byId.values()]);
  }, [products, activeMobilePages.products, filterAndSort]);
  const mobileHasMore = Boolean(
    pagination && products.length + activeMobilePages.products.length < pagination.total,
  );

  async function loadMoreProducts() {
    if (!pagination || mobileLoading || !mobileHasMore) return;

    setMobileLoading(true);
    setMobileLoadError(false);
    const nextPage = activeMobilePages.loadedPage + 1;
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pagination.pageSize),
    });
    const categorySlug = activeChildSlug ?? activeRootSlug;
    if (categorySlug) params.set("category", categorySlug);
    if (activeRootSlug && !activeChildSlug) params.set("includeCategoryChildren", "true");
    if (selectedBrandSlugs.length > 0) params.set("brands", selectedBrandSlugs.join(","));
    if (selectedShopSlugs.length > 0) params.set("shops", selectedShopSlugs.join(","));

    try {
      const response = await fetch(`/api/catalog-products?${params}`);
      if (!response.ok) throw new Error(`Catalog API ${response.status}`);
      const result = (await response.json()) as ApiProductListResult;
      const nextProducts = result.items.map((product) => mapApiProductToCatalog(product));
      setMobilePages((current) => ({
        key: mobileDatasetKey,
        products:
          current.key === mobileDatasetKey
            ? [...current.products, ...nextProducts]
            : nextProducts,
        loadedPage: nextPage,
      }));
    } catch {
      setMobileLoadError(true);
    } finally {
      setMobileLoading(false);
    }
  }

  function resetFilters() {
    setPriceFrom("");
    setPriceTo("");
    const hasQueryFilters =
      selectedBrandSlugs.length > 0 ||
      selectedShopSlugs.length > 0;
    if (hasQueryFilters) {
      replaceQuery((params) => {
        params.delete("brands");
        params.delete("shops");
        params.delete("page");
      });
    }
  }

  const priceActive = priceFrom.trim() !== "" || priceTo.trim() !== "";
  const activeCount =
    (priceActive ? 1 : 0) +
    (selectedBrandSlugs.length > 0 ? 1 : 0) +
    (selectedShopSlugs.length > 0 ? 1 : 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:mb-5">
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Главная</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {parentBreadcrumb ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href={parentBreadcrumb.href} />}>
                    {parentBreadcrumb.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ) : null}
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <p className="shrink-0 text-[13px] tabular-nums text-muted-foreground sm:text-sm">
          {totalCount.toLocaleString("ru-RU")} товаров
        </p>
      </div>

      <div className="grid gap-x-6 gap-y-6 min-[992px]:grid-cols-[240px_minmax(0,1fr)] min-[1200px]:grid-cols-[260px_minmax(0,1fr)] min-[1200px]:gap-x-7">
        <aside className="hidden h-fit min-[992px]:sticky min-[992px]:top-20 min-[992px]:block">
          <CategoryTree
            categories={categoryTree ?? []}
            totalProductCount={allCategoriesProductCount}
            activeRootSlug={activeRootSlug}
            activeChildSlug={activeChildSlug}
          />
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3 sm:mb-4">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-[992px]:hidden"
                onClick={() => setMobileCategoriesOpen(true)}
              >
                <ListTree className="size-4" />
                Категории
              </Button>
              {pagination ? (
                <CatalogPagination
                  page={pagination.page}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  basePath={pagination.basePath}
                  className="mx-0 hidden w-auto justify-start pt-0 sm:flex"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{filtered.length}</span>
                  {" из "}
                  {totalCount}
                </p>
              )}
            </div>

            <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
              <FilterDropdown label="Цена" activeCount={priceActive ? 1 : 0}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Цена, ₽
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">От</span>
                    <Input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={priceFrom}
                      placeholder={String(absMin)}
                      aria-label="Минимальная цена"
                      onChange={(event) => setPriceFrom(event.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">До</span>
                    <Input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={priceTo}
                      placeholder={String(absMax)}
                      aria-label="Максимальная цена"
                      onChange={(event) => setPriceTo(event.target.value)}
                    />
                  </label>
                </div>
              </FilterDropdown>
              <MultiSelectFilter
                label="Магазин"
                options={shops ?? []}
                selected={selectedShopSlugs}
                onToggle={onToggleShop}
              />
              <MultiSelectFilter
                label="Бренд"
                options={brands ?? []}
                selected={selectedBrandSlugs}
                onToggle={onToggleBrand}
              />
              <SortDropdown value={sort} onChange={setSort} />
              {activeCount > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                  Сбросить
                </Button>
              ) : null}
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
              <div className="grid grid-cols-2 gap-3 sm:hidden">
                {mobileProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="hidden grid-cols-2 gap-3 sm:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {pagination && mobileHasMore ? (
                <div className="sm:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={mobileLoading}
                    onClick={() => void loadMoreProducts()}
                  >
                    {mobileLoading
                      ? "Загрузка…"
                      : mobileLoadError
                        ? "Повторить загрузку"
                        : "Загрузить ещё"}
                  </Button>
                  {mobileLoadError ? (
                    <p className="mt-2 text-center text-xs text-destructive">
                      Не удалось загрузить товары
                    </p>
                  ) : null}
                </div>
              ) : null}
              {pagination ? (
                <div className="hidden sm:block">
                  <CatalogPagination
                    page={pagination.page}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    basePath={pagination.basePath}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Sheet open={mobileCategoriesOpen} onOpenChange={setMobileCategoriesOpen}>
        <SheetContent side="left" className="w-[min(100%,20rem)] gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Категории</SheetTitle>
            <SheetDescription>Выберите нужный раздел каталога</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-4 py-5">
            <CategoryTree
              categories={categoryTree ?? []}
              totalProductCount={allCategoriesProductCount}
              activeRootSlug={activeRootSlug}
              activeChildSlug={activeChildSlug}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
