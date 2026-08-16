import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDERS = Array.from({ length: 15 }, (_, index) => index);

export function ProductGridSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-label="Загрузка товаров"
      aria-busy="true"
    >
      {PLACEHOLDERS.map((index) => (
        <Skeleton
          key={index}
          className="catalog-product-skeleton aspect-square w-full rounded-xl border border-border/80 shadow-sm"
        />
      ))}
    </div>
  );
}
