import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ProductCardSkeleton() {
  return (
    <Card className="relative flex h-full flex-col gap-0 overflow-hidden rounded-none bg-transparent py-0 ring-0">
      <div className="flex min-h-0 flex-1 flex-col">
        <Skeleton className="catalog-product-skeleton aspect-[4/5] w-full shrink-0 rounded-none" />

        <div className="flex flex-1 flex-col gap-1.5 px-4 pt-4 pb-3">
          <div className="flex h-4 items-center">
            <Skeleton className="catalog-product-skeleton h-2.5 w-2/5 rounded-none" />
          </div>

          <div className="flex h-11 flex-col justify-center gap-2">
            <Skeleton className="catalog-product-skeleton h-3.5 w-11/12 rounded-none" />
            <Skeleton className="catalog-product-skeleton h-3.5 w-3/4 rounded-none" />
          </div>

          <div className="mt-auto flex h-9 items-center pt-2">
            <Skeleton className="catalog-product-skeleton h-5 w-1/2 rounded-none" />
          </div>
        </div>
      </div>

      <div className="absolute top-2 right-2 flex size-10 items-center justify-center">
        <Skeleton className="catalog-product-skeleton size-7 rounded-full" />
      </div>
    </Card>
  );
}

type ProductGridSkeletonProps = {
  count?: number;
};

export function ProductGridSkeleton({ count = 15 }: ProductGridSkeletonProps) {
  const placeholders = Array.from({ length: count }, (_, index) => index);

  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-label="Загрузка товаров"
      aria-busy="true"
    >
      {placeholders.map((index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
