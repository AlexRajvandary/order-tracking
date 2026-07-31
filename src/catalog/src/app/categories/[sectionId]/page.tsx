import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { getCategorySection } from "@/lib/categories";
import { listProductsForSection } from "@/lib/catalog-products";

type PageProps = {
  params: Promise<{ sectionId: string }>;
};

export default async function CategorySectionPage({ params }: PageProps) {
  const { sectionId } = await params;
  const section = getCategorySection(sectionId);
  if (!section) notFound();

  const products = listProductsForSection(sectionId);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6">
        <CatalogBrowser
          products={products}
          title={section.title}
          subtitle="Все подкатегории · демо-каталог"
          backHref="/"
          backLabel="На главную"
          subcategoryOptions={section.items.map((item) => ({
            slug: item.slug,
            label: item.label,
          }))}
        />
      </main>
    </div>
  );
}
