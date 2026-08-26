import Link from "next/link";
import { HeroV2 } from "@/components/hero/hero-v2";
import { LegacyImageHero } from "@/components/legacy-image-hero";
import { CategoryCard } from "@/components/category-card";
import { FashionCategorySection } from "@/components/fashion-category-section";
import { PopularCategories } from "@/components/popular-categories";
import { SiteHeader } from "@/components/site-header";
import { StorefrontAnnouncement } from "@/components/storefront-announcement";
import { categorySections } from "@/lib/categories";
import { fetchStorefrontAnnouncement } from "@/lib/storefront-announcement-api";
import { fetchCategoryTree, type ApiCategory } from "@/lib/categories-api";
import { cn } from "@/lib/utils";

// Set to false to restore the legacy image-based THE GET hero.
const USE_NEW_HERO = true;

/** Map legacy grid section ids → category slugs in Products DB. */
const SECTION_TO_ROUTE: Record<string, string> = {
  "women-fashion": "clothing",
  "men-fashion": "clothing",
  sports: "fishing",
  dvd: "books",
};

function sectionRouteId(sectionId: string): string {
  return SECTION_TO_ROUTE[sectionId] ?? sectionId;
}

function findFashionRoot(tree: ApiCategory[], gender: "women" | "men") {
  const pattern = gender === "women" ? /жен|women|female/i : /муж|men|male/i;
  const direct = tree.find((category) => pattern.test(`${category.name} ${category.slug}`));
  if (direct) return direct;
  const clothing = tree.find((category) => /одеж|clothing|fashion/i.test(`${category.name} ${category.slug}`));
  return clothing?.children.find((category) => pattern.test(`${category.name} ${category.slug}`));
}

function fallbackFashionCategories(sectionId: "women-fashion" | "men-fashion") {
  const section = categorySections.find((item) => item.id === sectionId);
  return section?.items.map((item) => ({ id: item.id, name: item.label, slug: item.slug, description: null, imageUrl: item.imageUrl, productCount: 0 })) ?? [];
}

type FashionCategoryData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
};

function toFashionCategories(categories: Array<Pick<FashionCategoryData, "id" | "name" | "slug" | "description" | "imageUrl">>, gender?: "women" | "men"): FashionCategoryData[] {
  const men = gender === "men";
  return categories.map((category) => ({
    ...category,
    imageUrl: men && /kimono|кимон/i.test(`${category.name} ${category.slug}`)
      ? "/catalog-assets/mens-kimono.png"
      : category.imageUrl,
  }));
}

function toWomenFashionCategories(categories: Array<Pick<FashionCategoryData, "id" | "name" | "slug" | "description" | "imageUrl">>): FashionCategoryData[] {
  return toFashionCategories(categories).map((category) =>
    /kimono|\u043a\u0438\u043c\u043e\u043d/i.test(`${category.name} ${category.slug}`)
      ? { ...category, imageUrl: "/catalog-assets/womens-kimono.png" }
      : category,
  );
}

function toMenFashionCategories(categories: Array<Pick<FashionCategoryData, "id" | "name" | "slug" | "description" | "imageUrl">>): FashionCategoryData[] {
  return toFashionCategories(categories, "men").map((category) =>
    /kimono|\u043a\u0438\u043c\u043e\u043d/i.test(`${category.name} ${category.slug}`)
      ? { ...category, imageUrl: "/catalog-assets/mens-kimono.png" }
      : category,
  );
}

export default async function HomePage() {
  const announcement = await fetchStorefrontAnnouncement();
  const categoryTree = await fetchCategoryTree({ includeProductCounts: true, productsActiveOnly: true }).catch(() => []);
  const womenRoot = findFashionRoot(categoryTree, "women");
  const menRoot = findFashionRoot(categoryTree, "men");
  const fashionSections = new Map([
    ["women-fashion", { root: womenRoot, categories: toWomenFashionCategories(womenRoot?.children?.length ? womenRoot.children : fallbackFashionCategories("women-fashion")) }],
    ["men-fashion", { root: menRoot, categories: toMenFashionCategories(menRoot?.children?.length ? menRoot.children : fallbackFashionCategories("men-fashion")) }],
  ]);
  const orderedSections = [
    ...categorySections.filter((section) => section.id === "women-fashion" || section.id === "men-fashion"),
    ...categorySections.filter((section) => section.id !== "women-fashion" && section.id !== "men-fashion"),
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <SiteHeader />
      <StorefrontAnnouncement text={announcement?.text} />
      <div className="overflow-x-hidden">
        {USE_NEW_HERO ? <HeroV2 /> : <LegacyImageHero />}
        <PopularCategories className="mt-8 mb-10 sm:mt-16 sm:mb-16" />
        <main className="mx-auto max-w-6xl flex-1 space-y-12 px-4 pt-0 pb-12 sm:space-y-[72px] sm:px-6 sm:pb-16">
          {orderedSections.map((section) => (
            <section key={section.id} id={section.id}>
              {fashionSections.has(section.id) ? (() => {
                const fashion = fashionSections.get(section.id)!;
                return <FashionCategorySection title={section.title} subtitle="Одежда и аксессуары на любой стиль" rootSlug={fashion.root?.slug ?? sectionRouteId(section.id)} categories={fashion.categories} />;
              })() : null}
              {!fashionSections.has(section.id) ? <>
              <div className="mb-5 flex items-center justify-between gap-3 sm:mb-10 sm:gap-4">
                <h2 className="flex min-w-0 items-center gap-2.5 text-[22px] font-bold tracking-tight text-[#111] sm:gap-3 sm:text-[30px]">
                  <span
                    className="inline-block h-[0.85em] w-1 shrink-0 rounded-full bg-[#F24676]"
                    aria-hidden
                  />
                  <span className="truncate">{section.title}</span>
                </h2>
                <Link
                  href={`/categories/${sectionRouteId(section.id)}`}
                  className="group inline-flex shrink-0 items-center gap-1 text-[13px] text-[#666] transition-colors duration-200 hover:text-[#F24676] sm:text-[15px]"
                >
                  <span className="sm:hidden">Все</span>
                  <span className="hidden sm:inline">Смотреть все</span>
                  <span
                    aria-hidden
                    className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </div>
              <div
                className={cn(
                  "grid grid-cols-2 items-stretch gap-3 sm:gap-5 lg:gap-6",
                  section.columns === 4
                    ? "sm:grid-cols-4"
                    : "sm:grid-cols-4 lg:grid-cols-6",
                )}
              >
                {section.items.map((item) => (
                  <CategoryCard
                    key={item.id}
                    item={item}
                    sectionId={sectionRouteId(section.id)}
                  />
                ))}
              </div>
              </> : null}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
