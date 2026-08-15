"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type CatalogPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Path without query, e.g. /categories/bags */
  basePath: string;
  className?: string;
};

function buildHref(basePath: string, page: number): string {
  const url = new URL(basePath, "http://local.invalid");
  if (page <= 1) url.searchParams.delete("page");
  else url.searchParams.set("page", String(page));
  const search = url.searchParams.toString();
  return search ? `${url.pathname}?${search}` : url.pathname;
}

function pageItems(current: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);

  if (left > 2) items.push("ellipsis");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

export function CatalogPagination({
  page,
  pageSize,
  total,
  basePath,
  className,
}: CatalogPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(1, page), totalPages);
  const items = pageItems(current, totalPages);

  return (
    <Pagination className={className ?? "pt-2"}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={current > 1 ? buildHref(basePath, current - 1) : undefined}
            aria-disabled={current <= 1}
            className={cn(
              "rounded-md bg-transparent shadow-none hover:bg-muted/50",
              current <= 1 && "pointer-events-none opacity-50",
            )}
          />
        </PaginationItem>

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem key={`e-${index}`} className="max-[1199px]:hidden">
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem
              key={item}
              className={item === current ? undefined : "max-[1199px]:hidden"}
            >
              <PaginationLink
                href={buildHref(basePath, item)}
                isActive={item === current}
                className={cn(
                  "rounded-md bg-transparent shadow-none",
                  item === current
                    ? "border-[#D1D5DB] font-semibold hover:bg-transparent"
                    : "font-normal hover:bg-muted/50",
                )}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href={current < totalPages ? buildHref(basePath, current + 1) : undefined}
            aria-disabled={current >= totalPages}
            className={cn(
              "rounded-md bg-transparent shadow-none hover:bg-muted/50",
              current >= totalPages && "pointer-events-none opacity-50",
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
