"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ApiCategory } from "@/lib/categories-api";
import { categoryHref } from "@/lib/categories-api";
import { cn } from "@/lib/utils";

type CategoryTreeProps = {
  categories: ApiCategory[];
  activeRootSlug?: string;
  activeChildSlug?: string;
  className?: string;
};

function CategoryBranch({
  category,
  activeRootSlug,
  activeChildSlug,
  forceOpen,
}: {
  category: ApiCategory;
  activeRootSlug?: string;
  activeChildSlug?: string;
  forceOpen?: boolean;
}) {
  const isActiveRoot =
    activeRootSlug === category.slug && !activeChildSlug;
  const hasActiveChild =
    activeRootSlug === category.slug && Boolean(activeChildSlug);
  const hasChildren = category.children.length > 0;

  const [open, setOpen] = useState(forceOpen || isActiveRoot || hasActiveChild);

  useEffect(() => {
    if (forceOpen || isActiveRoot || hasActiveChild) setOpen(true);
  }, [forceOpen, isActiveRoot, hasActiveChild]);

  return (
    <li className="min-w-0">
      <div className="flex items-stretch gap-0.5">
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Свернуть" : "Развернуть"}
            onClick={() => setOpen((v) => !v)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-[#F3F4F6] hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )}

        <Link
          href={categoryHref(category.slug)}
          className={cn(
            "flex min-w-0 flex-1 items-center rounded-md px-2 py-1.5 text-sm transition",
            isActiveRoot
              ? "bg-[#111827] font-medium text-white"
              : hasActiveChild
                ? "bg-[#F3F4F6] font-medium text-foreground"
                : "text-foreground hover:bg-[#F3F4F6]",
          )}
        >
          <span className="truncate">{category.name}</span>
          {hasChildren ? (
            <span
              className={cn(
                "ml-auto pl-2 text-[11px] tabular-nums",
                isActiveRoot
                  ? "text-white/60"
                  : "text-muted-foreground",
              )}
            >
              {category.children.length}
            </span>
          ) : null}
        </Link>
      </div>

      {hasChildren && open ? (
        <ul
          className="relative ml-4 mt-0.5 space-y-0.5 border-l border-[#E5E7EB] pl-2"
          role="group"
        >
          {category.children.map((child) => {
            const isActiveChild =
              activeRootSlug === category.slug &&
              activeChildSlug === child.slug;
            return (
              <li key={child.id}>
                <Link
                  href={categoryHref(category.slug, child.slug)}
                  className={cn(
                    "block truncate rounded-md px-2.5 py-1.5 text-sm transition",
                    isActiveChild
                      ? "bg-[#111827] font-medium text-white"
                      : "text-[rgba(17,24,39,0.78)] hover:bg-[#F3F4F6] hover:text-foreground",
                  )}
                >
                  {child.name}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

export function CategoryTree({
  categories,
  activeRootSlug,
  activeChildSlug,
  className,
}: CategoryTreeProps) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Категории пока не загружены</p>
    );
  }

  return (
    <nav aria-label="Категории" className={className}>
      <ul className="space-y-0.5">
        {categories.map((category) => (
          <CategoryBranch
            key={category.id}
            category={category}
            activeRootSlug={activeRootSlug}
            activeChildSlug={activeChildSlug}
          />
        ))}
      </ul>
    </nav>
  );
}
