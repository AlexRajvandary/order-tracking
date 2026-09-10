"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, LoaderCircle } from "lucide-react";
import { CatalogSearchSuggestions } from "@/components/catalog-search-suggestions";
import type { ApiCategory } from "@/lib/categories-api";
import { categoryHref } from "@/lib/categories-api";
import { cn } from "@/lib/utils";

type CategoryTreeProps = {
  categories: ApiCategory[];
  totalProductCount?: number;
  activeRootSlug?: string;
  activeChildSlug?: string;
  className?: string;
  onNavigate?: () => void;
  selectedProductCount?: number;
  selectedProductCountLoading?: boolean;
};

function formatCount(value: number): string {
  return value.toLocaleString("ru-RU").replace(/\s/g, "\u00A0");
}

function ChildLink({
  category,
  rootSlug,
  selected,
  onNavigate,
  selectedProductCount,
  selectedProductCountLoading = false,
}: {
  category: ApiCategory;
  rootSlug: string;
  selected: boolean;
  onNavigate?: () => void;
  selectedProductCount?: number;
  selectedProductCountLoading?: boolean;
}) {
  return (
    <Link
      href={categoryHref(rootSlug, category.slug)}
      onClick={onNavigate}
      className={cn(
        "relative flex min-w-0 items-center gap-2 overflow-hidden rounded-md py-1.5 pr-8 pl-4 text-[13px] leading-5 transition-colors",
        selected
          ? "bg-[var(--category-selected-bg)] font-semibold text-[var(--category-selected-text)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--category-selected-accent)]"
          : "text-[#6B7280] hover:bg-[#F7F7F7] hover:text-[#1F2937]",
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1",
          rootSlug === "tcg" ? "line-clamp-2 leading-4" : "truncate",
        )}
      >
        {category.name}
      </span>
      <span
        className={cn(
          "w-[4.5rem] shrink-0 text-right text-xs font-normal tabular-nums",
          selected ? "text-[var(--category-selected-muted)]" : "text-[#9CA3AF]",
        )}
      >
        {selectedProductCountLoading ? (
          <LoaderCircle aria-label="Обновление количества товаров" className="ml-auto size-3.5 animate-spin" />
        ) : (
          formatCount(selectedProductCount ?? category.productCount)
        )}
      </span>
    </Link>
  );
}

export function CategoryTree({
  categories,
  totalProductCount,
  activeRootSlug,
  activeChildSlug,
  className,
  onNavigate,
  selectedProductCount,
  selectedProductCountLoading = false,
}: CategoryTreeProps) {
  const selectionKey = `${activeRootSlug ?? ""}:${activeChildSlug ?? ""}`;
  const [query, setQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [accordion, setAccordion] = useState({
    selectionKey,
    expandedSlug: activeRootSlug ?? null,
  });
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
  const expandedSlug =
    accordion.selectionKey === selectionKey
      ? accordion.expandedSlug
      : (activeRootSlug ?? null);

  const visibleCategories = useMemo(() => {
    if (!normalizedQuery) {
      return categories.map((category) => ({
        category,
        visibleChildren: category.children,
      }));
    }

    return categories.flatMap((category) => {
      const rootMatches = category.name.toLocaleLowerCase("ru-RU").includes(normalizedQuery);
      const visibleChildren = category.children.filter((child) =>
        child.name.toLocaleLowerCase("ru-RU").includes(normalizedQuery),
      );

      return rootMatches || visibleChildren.length > 0
        ? [{ category, visibleChildren }]
        : [];
    });
  }, [categories, normalizedQuery]);

  function toggleCategory(slug: string) {
    setAccordion({
      selectionKey,
      expandedSlug: expandedSlug === slug ? null : slug,
    });
  }

  function handleNavigate() {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    onNavigate?.();
  }

  return (
    <nav aria-label="Категории" className={className}>
      <CatalogSearchSuggestions categories={categories} value={query} onChange={setQuery} onNavigate={handleNavigate} onActiveChange={setSearchActive} />

      <div className={cn("w-full min-w-0", searchActive && "max-[991px]:hidden")}>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Категории пока не загружены</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {!normalizedQuery ? (
            <li>
              <Link
                href="/categories/all"
                onClick={handleNavigate}
                className={cn(
                  "relative flex items-center gap-2 overflow-hidden rounded-md px-2 py-2 transition-colors",
                  !activeRootSlug
                    ? "bg-[var(--category-selected-bg)] font-semibold text-[var(--category-selected-text)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--category-selected-accent)]"
                    : "font-medium text-[#374151] hover:bg-[#F7F7F7]",
                )}
              >
                <span className="min-w-0 flex-1 truncate">Все категории</span>
                {totalProductCount != null ? (
                  <span
                    className={cn(
                      "w-[4.5rem] shrink-0 text-right text-xs font-normal tabular-nums",
                      !activeRootSlug
                        ? "text-[var(--category-selected-muted)]"
                        : "text-[#9CA3AF]",
                    )}
                  >
                    {selectedProductCountLoading && !activeRootSlug ? (
                      <LoaderCircle aria-label="Обновление количества товаров" className="ml-auto size-3.5 animate-spin" />
                    ) : (
                      formatCount(
                        !activeRootSlug
                          ? (selectedProductCount ?? totalProductCount)
                          : totalProductCount,
                      )
                    )}
                  </span>
                ) : null}
                <span aria-hidden="true" className="w-8 shrink-0" />
              </Link>
            </li>
          ) : null}

          {visibleCategories.map(({ category, visibleChildren }) => {
            const hasChildren = category.children.length > 0;
            const isExpanded = normalizedQuery
              ? visibleChildren.length > 0
              : expandedSlug === category.slug;
            const isActive =
              activeRootSlug === category.slug && !activeChildSlug;

            return (
              <li key={category.id}>
                <div
                  className={cn(
                    "relative flex min-w-0 items-center overflow-hidden rounded-md transition-colors",
                    isActive
                      ? "bg-[var(--category-selected-bg)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--category-selected-accent)]"
                      : "hover:bg-[#F7F7F7]",
                  )}
                >
                  <Link
                    href={categoryHref(category.slug)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 py-2 pl-2 font-medium text-[#374151]",
                      isActive && "font-semibold text-[var(--category-selected-text)]",
                    )}
                    onClick={() => {
                      setAccordion({ selectionKey, expandedSlug: category.slug });
                      handleNavigate();
                    }}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1",
                        category.slug === "tcg"
                          ? "line-clamp-2 leading-5"
                          : "truncate",
                      )}
                    >
                      {category.name}
                    </span>
                    <span
                      className={cn(
                        "w-[4.5rem] shrink-0 text-right text-xs font-normal tabular-nums",
                        isActive
                          ? "text-[var(--category-selected-muted)]"
                          : "text-[#9CA3AF]",
                      )}
                    >
                      {selectedProductCountLoading && isActive ? (
                        <LoaderCircle aria-label="Обновление количества товаров" className="ml-auto size-3.5 animate-spin" />
                      ) : (
                        formatCount(
                          isActive
                            ? (selectedProductCount ?? category.productCount)
                            : category.productCount,
                        )
                      )}
                    </span>
                  </Link>

                  {hasChildren && (!normalizedQuery || visibleChildren.length > 0) ? (
                    <button
                      type="button"
                      aria-label={`${isExpanded ? "Свернуть" : "Развернуть"} категорию ${category.name}`}
                      aria-expanded={isExpanded}
                      className={cn(
                        "flex size-8 shrink-0 cursor-pointer items-center justify-center transition-colors hover:text-[#4B5563]",
                        isActive
                          ? "text-[var(--category-selected-muted)]"
                          : "text-[#9CA3AF]",
                      )}
                      onClick={() => toggleCategory(category.slug)}
                    >
                      {isExpanded ? (
                        <ChevronDown aria-hidden="true" className="size-3.5" />
                      ) : (
                        <ChevronRight aria-hidden="true" className="size-3.5" />
                      )}
                    </button>
                  ) : (
                    <span aria-hidden="true" className="w-8 shrink-0" />
                  )}
                </div>

                {isExpanded && visibleChildren.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {visibleChildren.map((child) => {
                      const selected =
                        activeRootSlug === category.slug &&
                        activeChildSlug === child.slug;

                      return (
                      <li key={child.id}>
                        <ChildLink
                          category={child}
                          rootSlug={category.slug}
                          selected={selected}
                          onNavigate={handleNavigate}
                          selectedProductCount={selected ? selectedProductCount : undefined}
                          selectedProductCountLoading={selected && selectedProductCountLoading}
                        />
                      </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {categories.length > 0 && visibleCategories.length === 0 ? (
        <p className="px-2 py-3 text-sm text-[#6B7280]">Категории не найдены</p>
      ) : null}
      </div>
    </nav>
  );
}
