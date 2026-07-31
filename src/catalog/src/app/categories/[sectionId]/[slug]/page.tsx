import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { findCategoryItem } from "@/lib/categories";
import { listProductsForCategoryItem } from "@/lib/catalog-products";

type PageProps = {
  params: Promise<{ sectionId: string; slug: string }>;
};

export default async function CategoryItemPage({ params }: PageProps) {
  const { sectionId, slug } = await params;
  const found = findCategoryItem(sectionId, slug);
  if (!found) notFound();

  const { section, item } = found;
  const products = listProductsForCategoryItem(sectionId, slug);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6">
        <CatalogBrowser
          products={products}
          title={item.label}
          subtitle={`${section.title} · демо-каталог`}
          imageUrl={item.imageUrl}
          backHref={`/categories/${section.id}`}
          backLabel={section.title}
        />
      </main>
    </div>
  );
}
