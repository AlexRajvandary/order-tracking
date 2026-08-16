import { ProductGridSkeleton } from "@/components/product-grid-skeleton";
import { SiteHeader } from "@/components/site-header";

export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 sm:px-8 lg:px-10">
        <div className="pt-12 min-[992px]:ml-[266px] min-[1200px]:ml-[287px]">
          <ProductGridSkeleton />
        </div>
      </main>
    </div>
  );
}
