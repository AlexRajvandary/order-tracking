import Link from "next/link";
import { HeroV2 } from "@/components/hero/hero-v2";
import { LegacyImageHero } from "@/components/legacy-image-hero";
import { CategoryCard } from "@/components/category-card";
import { PopularCategories } from "@/components/popular-categories";
import { SiteHeader } from "@/components/site-header";
import { categorySections } from "@/lib/categories";
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <SiteHeader />
      <div className="overflow-x-hidden">
        {USE_NEW_HERO ? <HeroV2 /> : <LegacyImageHero />}
        <PopularCategories className="mt-8 mb-10 sm:mt-16 sm:mb-16" />
        <main className="mx-auto max-w-6xl flex-1 space-y-12 px-4 pt-0 pb-12 sm:space-y-[72px] sm:px-6 sm:pb-16">
          {categorySections.map((section) => (
            <section key={section.id} id={section.id}>
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
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
