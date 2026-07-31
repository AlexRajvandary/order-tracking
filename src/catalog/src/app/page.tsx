import Link from "next/link";
import { HeroV2 } from "@/components/hero/hero-v2";
import { LegacyImageHero } from "@/components/legacy-image-hero";
import { CategoryCard } from "@/components/category-card";
import { PopularCategories } from "@/components/popular-categories";
import { SiteHeader } from "@/components/site-header";
import { categorySections } from "@/lib/categories";

// Set to false to restore the legacy image-based THE GET hero.
const USE_NEW_HERO = true;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <SiteHeader />
      {USE_NEW_HERO ? <HeroV2 /> : <LegacyImageHero />}
      <PopularCategories className="mt-16 mb-16" />
      <main className="mx-auto max-w-6xl flex-1 space-y-[72px] px-4 pt-0 pb-16 sm:px-6">
        {categorySections.map((section) => (
          <section key={section.id} id={section.id}>
            <div className="mb-10 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-3 text-[30px] font-bold tracking-tight text-[#111]">
                <span
                  className="inline-block h-[0.85em] w-1 shrink-0 rounded-full bg-[#F24676]"
                  aria-hidden
                />
                {section.title}
              </h2>
              <Link
                href={`/categories/${section.id}`}
                className="group inline-flex shrink-0 items-center gap-1 text-[15px] text-[#666] transition-colors duration-200 hover:text-[#F24676]"
              >
                Смотреть все
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6 lg:gap-6">
              {section.items.map((item) => (
                <CategoryCard key={item.id} item={item} sectionId={section.id} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
