import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BAGS_COLLECTION } from "@/lib/bags-collection";
import { findCatalogProductBySlug, listProductsForCategoryItem } from "@/lib/catalog-products";
import { formatPrice, getProductById, listProducts, type Product } from "@/lib/products";

type PageProps = {
  params: Promise<{ id: string }>;
};

function resolveProduct(id: string): Product | undefined {
  return getProductById(id) ?? findCatalogProductBySlug(id);
}

export function generateStaticParams() {
  const demo = listProducts().map((p) => ({ id: p.slug }));
  const bags = BAGS_COLLECTION.map((p) => ({ id: p.slug }));
  return [...demo, ...bags];
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const product = resolveProduct(id);
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
  const product = resolveProduct(id);
  if (!product) {
    notFound();
  }

  const catalog = findCatalogProductBySlug(product.slug);
  const related = catalog
    ? listProductsForCategoryItem(catalog.sectionId, catalog.categorySlug)
        .filter((p) => p.id !== product.id)
        .slice(0, 3)
    : listProducts()
        .filter((p) => p.id !== product.id && p.category === product.category)
        .slice(0, 3);

  const oldPriceLabel = product.oldPriceRub
    ? new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: product.currency,
        maximumFractionDigits: 0,
      }).format(product.oldPriceRub)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          render={<Link href={catalog ? `/categories/${catalog.sectionId}` : "/"} />}
        >
          ← {catalog ? "К категории" : "К каталогу"}
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          <div className="relative min-h-[280px] overflow-hidden rounded-xl border bg-muted sm:min-h-[400px]">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
                priority
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(150deg, ${product.tint}, oklch(0.25 0 0) 80%)`,
                }}
              />
            )}
            {!product.imageUrl ? (
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-3xl font-bold text-white/95 sm:text-4xl">{product.name}</p>
              </div>
            ) : null}
          </div>

          <Card className="h-fit">
            <CardHeader>
              <p className="text-xs text-muted-foreground">
                {product.brand ? `${product.brand} · ` : ""}
                {product.category}
              </p>
              <CardTitle className="text-2xl font-bold tracking-tight">{product.name}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {product.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="text-2xl font-bold">{formatPrice(product)}</p>
                {oldPriceLabel ? (
                  <p className="text-base text-muted-foreground line-through">{oldPriceLabel}</p>
                ) : null}
                {product.discountPercent ? (
                  <Badge variant="destructive">{product.discountPercent}</Badge>
                ) : null}
              </div>
              {product.rating != null ? (
                <p className="text-sm text-muted-foreground">
                  ★ {product.rating.toFixed(1)}
                  {product.reviewsCount != null ? ` · ${product.reviewsCount} отзывов` : ""}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {product.isPremium ? <Badge>premium</Badge> : null}
              </div>
              <Badge variant={product.inStock ? "default" : "outline"}>
                {product.inStock ? "В наличии" : "Нет в наличии"}
              </Badge>
              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row">
                <AddToCartButton product={product} size="lg" className="flex-1" />
                <Button size="lg" variant="outline" className="flex-1" render={<Link href="/cart" />}>
                  Перейти в корзину
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {related.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-bold">Ещё из категории «{product.category}»</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Card key={item.id} className="gap-0 overflow-hidden py-0">
                  <Link href={`/products/${item.slug}`} className="block">
                    <div className="relative aspect-[3/4] bg-muted">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{
                            background: `linear-gradient(145deg, ${item.tint}, oklch(0.25 0 0) 85%)`,
                          }}
                        />
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <CardDescription>{formatPrice(item)}</CardDescription>
                    </CardHeader>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
