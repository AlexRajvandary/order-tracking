import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  findCatalogProductBySlug,
  type CatalogProduct,
} from "@/lib/catalog-products";
import {
  fetchBagsCatalogPage,
  fetchProductById,
  fetchProductBySlug,
  mapApiProductToCatalog,
} from "@/lib/products-api";
import { formatPrice, getProductById, type Product } from "@/lib/products";

type PageProps = {
  params: Promise<{ id: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function resolveProduct(
  idOrSlug: string,
): Promise<CatalogProduct | Product | undefined> {
  const decoded = decodeURIComponent(idOrSlug);

  const fromDemo = getProductById(decoded) ?? findCatalogProductBySlug(decoded);
  if (fromDemo) return fromDemo;

  try {
    if (isUuid(decoded)) {
      const byId = await fetchProductById(decoded);
      if (byId) return mapApiProductToCatalog(byId);
    }

    const bySlug = await fetchProductBySlug(decoded);
    if (bySlug) return mapApiProductToCatalog(bySlug);
  } catch {
    // fall through to notFound
  }

  return undefined;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const product = await resolveProduct(id);
  if (!product) {
    return { title: "Товар не найден" };
  }
  return {
    title: product.name,
    description: product.shortDescription,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await resolveProduct(id);
  if (!product) {
    notFound();
  }

  const catalog =
    "sectionId" in product
      ? (product as CatalogProduct)
      : undefined;

  const categorySlug =
    ("categorySlug" in product && product.categorySlug) ||
    catalog?.categorySlug;

  let related: CatalogProduct[] = [];
  try {
    const bags = await fetchBagsCatalogPage({
      page: 1,
      pageSize: 12,
      categorySlug:
        categorySlug && categorySlug !== "bags" ? categorySlug : undefined,
    });
    related = bags.products
      .filter((p) => p.id !== product.id)
      .slice(0, 8) as CatalogProduct[];
  } catch {
    related = [];
  }

  const oldPriceLabel = product.oldPriceRub
    ? new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: product.currency,
        maximumFractionDigits: 0,
      }).format(product.oldPriceRub)
    : null;

  const backHref = catalog?.sectionId
    ? `/categories/${catalog.sectionId}${
        categorySlug && categorySlug !== "bags"
          ? `?sub=${encodeURIComponent(categorySlug)}`
          : ""
      }`
    : "/categories/bags";

  const conditionLabel =
    product.condition === "used"
      ? "Б/У"
      : product.condition === "new"
        ? "Новое"
        : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          render={<Link href={backHref} />}
        >
          ← Назад к каталогу
        </Button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border bg-muted sm:aspect-[3/4] lg:min-h-[36rem] lg:aspect-auto">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                decoding="async"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-contain bg-white"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(150deg, ${product.tint}, oklch(0.25 0 0) 80%)`,
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {[product.brand, conditionLabel].filter(Boolean).join(" · ")}
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {product.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-bold tracking-tight">
                {formatPrice(product)}
              </p>
              {oldPriceLabel ? (
                <p className="text-lg text-muted-foreground line-through">
                  {oldPriceLabel}
                </p>
              ) : null}
              {product.discountPercent ? (
                <Badge variant="destructive">{product.discountPercent}</Badge>
              ) : null}
            </div>

            {product.shopName ? (
              <p className="text-sm text-muted-foreground">
                Магазин: {product.shopName}
              </p>
            ) : null}

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Button type="button" size="lg" className="flex-1">
                Купить
              </Button>
              <AddToCartButton
                product={product}
                size="lg"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-12 space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Похожие товары</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
