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

type CatalogPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Path without query, e.g. /categories/bags */
  basePath: string;
};

function buildHref(basePath: string, page: number): string {
  if (page <= 1) return basePath;
  return `${basePath}?page=${page}`;
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
}: CatalogPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(1, page), totalPages);
  const items = pageItems(current, totalPages);

  return (
    <Pagination className="pt-2">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={current > 1 ? buildHref(basePath, current - 1) : undefined}
            text="Назад"
            aria-disabled={current <= 1}
            className={current <= 1 ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem key={`e-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href={buildHref(basePath, item)}
                isActive={item === current}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href={current < totalPages ? buildHref(basePath, current + 1) : undefined}
            text="Вперёд"
            aria-disabled={current >= totalPages}
            className={
              current >= totalPages ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
