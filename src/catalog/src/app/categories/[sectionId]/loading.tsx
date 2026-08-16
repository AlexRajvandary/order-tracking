import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";

const PRODUCT_SKELETONS = Array.from({ length: 15 }, (_, index) => index);

export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main
        className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 sm:px-8 lg:px-10"
        aria-label="Загрузка каталога"
        aria-busy="true"
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-52 max-w-[60%]" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="grid gap-x-6 gap-y-6 min-[992px]:grid-cols-[240px_minmax(0,1fr)] min-[1200px]:grid-cols-[260px_minmax(0,1fr)] min-[1200px]:gap-x-7">
          <aside className="hidden min-[992px]:block">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="mb-4 h-9 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-9 w-full" />
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-3 flex gap-2 min-[992px]:pt-[25px]">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-9 w-24" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {PRODUCT_SKELETONS.map((index) => (
                <Skeleton key={index} className="aspect-square w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
