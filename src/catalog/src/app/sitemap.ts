import type { MetadataRoute } from "next";
import { categoryHref, fetchCategoryTree } from "@/lib/categories-api";
import { fetchProductSitemapItems } from "@/lib/products-api";
import { absoluteUrl } from "@/lib/seo";

const staticRoutes: MetadataRoute.Sitemap = [
  { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
  { url: absoluteUrl("/catalog/all"), changeFrequency: "daily", priority: 0.9 },
  { url: absoluteUrl("/find-product"), changeFrequency: "monthly", priority: 0.6 },
  { url: absoluteUrl("/individual-request"), changeFrequency: "monthly", priority: 0.6 },
  { url: absoluteUrl("/auction-request"), changeFrequency: "monthly", priority: 0.6 },
  { url: absoluteUrl("/ticket-request"), changeFrequency: "monthly", priority: 0.6 },
  { url: absoluteUrl("/item-weight"), changeFrequency: "monthly", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    fetchCategoryTree({
      includeProductCounts: true,
      productsActiveOnly: true,
    }),
    fetchProductSitemapItems().catch(() => []),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = categories.flatMap((root) => [
    {
      url: absoluteUrl(categoryHref(root.slug)),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    ...root.children
      .filter((child) => child.productCount > 0)
      .map((child) => ({
        url: absoluteUrl(categoryHref(root.slug, child.slug)),
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${encodeURIComponent(product.slug)}`),
    lastModified: product.lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
    ...(product.imageUrl
      ? { images: [product.imageUrl.startsWith("/") ? absoluteUrl(product.imageUrl) : product.imageUrl] }
      : {}),
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
