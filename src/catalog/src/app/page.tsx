import { HeroV2 } from "@/components/hero/hero-v2";
import { LegacyImageHero } from "@/components/legacy-image-hero";
import { PopularCategories } from "@/components/popular-categories";
import { SiteHeader } from "@/components/site-header";
// Hardcoded category grids (categories.ts) — disabled, same era as bags-collection.
// import Link from "next/link";
// import { CategoryCard } from "@/components/category-card";
// import { categorySections } from "@/lib/categories";

// Set to false to restore the legacy image-based THE GET hero.
const USE_NEW_HERO = true;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <SiteHeader />
      <div className="overflow-x-hidden">
        {USE_NEW_HERO ? <HeroV2 /> : <LegacyImageHero />}
        <PopularCategories className="mt-8 mb-10 sm:mt-16 sm:mb-16" />
        {/* Hardcoded ZenMarket category sections — commented out until Categories API.
        <main className="mx-auto max-w-6xl flex-1 space-y-12 px-4 pt-0 pb-12 sm:space-y-[72px] sm:px-6 sm:pb-16">
          {categorySections.map((section) => (
            <section key={section.id} id={section.id}>
              ...
            </section>
          ))}
        </main>
        */}
      </div>
    </div>
  );
}
