import { HomeSectionHeading } from "@/components/home/home-section-heading";
import { ProductCard } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/product-grid-skeleton";
import type { fetchCatalogPage } from "@/lib/products-api";

type CatalogPageResult = Awaited<ReturnType<typeof fetchCatalogPage>>;

type HomeProductsProps = {
  result: Promise<CatalogPageResult>;
};

export async function HomeProducts({ result }: HomeProductsProps) {
  let products: CatalogPageResult["products"] = [];
  let failed = false;

  try {
    products = (await result).products;
  } catch {
    failed = true;
  }

  return (
    <section>
      <HomeSectionHeading
        title="Новинки"
        href="/categories/одежда"
        linkLabel="Вся одежда"
      />
      {failed ? (
        <div className="border border-border px-5 py-12 text-center text-sm text-muted-foreground">
          Не удалось загрузить товары. Попробуйте обновить страницу.
        </div>
      ) : products.length === 0 ? (
        <div className="border border-border px-5 py-12 text-center text-sm text-muted-foreground">
          В этой категории пока нет товаров.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

export function HomeProductsSkeleton() {
  return (
    <section>
      <HomeSectionHeading
        title="Новинки"
        href="/categories/одежда"
        linkLabel="Вся одежда"
      />
      <ProductGridSkeleton count={5} />
    </section>
  );
}
