import Link from "next/link";
import { BrandLetterMark } from "@/components/brand-letter-mark";
import { CategoryCard } from "@/components/category-card";
import { SiteHeader } from "@/components/site-header";
import { categorySections } from "@/lib/categories";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <BrandLetterMark />
      <main className="mx-auto max-w-6xl flex-1 space-y-10 px-4 py-6">
        {categorySections.map((section) => (
          <section key={section.id} id={section.id} className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{section.title}</h2>
              <Link
                href={`/categories/${section.id}`}
                className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Смотреть все →
              </Link>
            </div>
            <div
              className={cn(
                "grid gap-3 sm:gap-4",
                section.columns === 4
                  ? "grid-cols-2 sm:grid-cols-4"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
              )}
            >
              {section.items.map((item) => (
                <CategoryCard key={item.id} item={item} sectionId={section.id} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        The Get catalog · in-memory demo
      </footer>
    </div>
  );
}
