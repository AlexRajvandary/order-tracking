import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategorySectionPage, {
  generateCategoryMetadata,
  type CategorySectionPageProps,
} from "@/lib/category-section-page";
import { safeDecode } from "@/lib/categories-api";

type CatalogPageProps = {
  params: Promise<{ sectionId: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type LegacySearchParams = Awaited<CategorySectionPageProps["searchParams"]>;

async function toCategoryProps({ params, searchParams }: CatalogPageProps): Promise<CategorySectionPageProps> {
  const [{ sectionId, slug }, query] = await Promise.all([params, searchParams]);
  if (slug && slug.length > 1) notFound();

  return {
    params: Promise.resolve({ sectionId }),
    searchParams: Promise.resolve({
      ...(query as LegacySearchParams),
      sub: slug?.[0] ? safeDecode(slug[0]) : undefined,
    }),
  };
}

export async function generateMetadata(props: CatalogPageProps): Promise<Metadata> {
  return generateCategoryMetadata(await toCategoryProps(props));
}

export default async function CatalogPage(props: CatalogPageProps) {
  return CategorySectionPage(await toCategoryProps(props));
}
