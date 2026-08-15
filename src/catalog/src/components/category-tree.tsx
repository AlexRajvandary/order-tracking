"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import type { ApiCategory } from "@/lib/categories-api";
import { categoryHref } from "@/lib/categories-api";
import { cn } from "@/lib/utils";

type CategoryTreeProps = {
  categories: ApiCategory[];
  totalProductCount?: number;
  activeRootSlug?: string;
  activeChildSlug?: string;
  className?: string;
};

function formatCount(value: number): string {
  return value.toLocaleString("ru-RU").replace(/\s/g, "\u00A0");
}

function ChildLink({
  category,
  rootSlug,
  selected,
}: {
  category: ApiCategory;
  rootSlug: string;
  selected: boolean;
}) {
  return (
    <Link
      href={categoryHref(rootSlug, category.slug)}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md py-1.5 pr-8 pl-4 text-[13px] leading-5 transition-colors",
        selected
          ? "bg-[#F5F5F5] font-medium text-[#1F2937]"
          : "text-[#6B7280] hover:bg-[#F7F7F7] hover:text-[#1F2937]",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{category.name}</span>
      <span className="w-[4.5rem] shrink-0 text-right text-xs font-normal tabular-nums text-[#9CA3AF]">
        {formatCount(category.productCount)}
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
}: CategoryTreeProps) {
  const selectionKey = `${activeRootSlug ?? ""}:${activeChildSlug ?? ""}`;
  const [query, setQuery] = useState("");
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

  return (
    <nav aria-label="Категории" className={className}>
      <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#4B5563] uppercase">
        Категории
      </p>

      <label className="relative mb-3 block">
        <span className="sr-only">Поиск категорий</span>
        <input
          type="search"
          value={query}
          placeholder="Поиск категорий"
          className="h-9 w-full rounded-md border border-[#D1D5DB] bg-transparent px-3 pr-9 text-sm text-[#1F2937] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#9CA3AF]"
          onChange={(event) => setQuery(event.target.value)}
        />
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#9CA3AF]"
        />
      </label>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Категории пока не загружены</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {!normalizedQuery ? (
            <li>
              <Link
                href="/categories/all"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 transition-colors",
                  !activeRootSlug
                    ? "bg-[#F5F5F5] font-medium text-[#1F2937]"
                    : "text-[#374151] hover:bg-[#F7F7F7]",
                )}
              >
                <span className="min-w-0 flex-1 truncate">Все категории</span>
                {totalProductCount != null ? (
                  <span className="w-[4.5rem] shrink-0 text-right text-xs font-normal tabular-nums text-[#9CA3AF]">
                    {formatCount(totalProductCount)}
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
            const isActive = activeRootSlug === category.slug;

            return (
              <li key={category.id}>
                <div
                  className={cn(
                    "flex min-w-0 items-center rounded-md transition-colors hover:bg-[#F7F7F7]",
                    (isExpanded || isActive) && "bg-[#F7F7F7]",
                  )}
                >
                  <Link
                    href={categoryHref(category.slug)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 py-2 pl-2 text-[#374151]",
                      (isExpanded || isActive) && "font-medium text-[#1F2937]",
                    )}
                    onClick={() =>
                      setAccordion({ selectionKey, expandedSlug: category.slug })
                    }
                  >
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    <span className="w-[4.5rem] shrink-0 text-right text-xs font-normal tabular-nums text-[#9CA3AF]">
                      {formatCount(category.productCount)}
                    </span>
                  </Link>

                  {hasChildren && (!normalizedQuery || visibleChildren.length > 0) ? (
                    <button
                      type="button"
                      aria-label={`${isExpanded ? "Свернуть" : "Развернуть"} категорию ${category.name}`}
                      aria-expanded={isExpanded}
                      className="flex size-8 shrink-0 cursor-pointer items-center justify-center text-[#9CA3AF] transition-colors hover:text-[#4B5563]"
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
                    {visibleChildren.map((child) => (
                      <li key={child.id}>
                        <ChildLink
                          category={child}
                          rootSlug={category.slug}
                          selected={
                            activeRootSlug === category.slug &&
                            activeChildSlug === child.slug
                          }
                        />
                      </li>
                    ))}
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
    </nav>
  );
}
