import Link from "next/link";
import { HomeSectionHeading } from "@/components/home/home-section-heading";
import { categoryHref, type ApiCategory } from "@/lib/categories-api";

const preferredSlugs = [
  "одежда",
  "instruments",
  "watches",
  "electronics",
  "beauty",
  "bags",
  "cameras",
  "товары-для-спорта-и-отдыха",
];

function selectCategories(categories: ApiCategory[]): ApiCategory[] {
  const active = categories.filter(
    (category) => category.isActive && category.productCount > 0,
  );
  const selected = preferredSlugs
    .map((slug) => active.find((category) => category.slug === slug))
    .filter((category): category is ApiCategory => Boolean(category));

  for (const category of active) {
    if (selected.length >= 8) break;
    if (!selected.some((item) => item.id === category.id)) selected.push(category);
  }

  return selected.slice(0, 8);
}

type HomeCategoriesProps = {
  categories: ApiCategory[];
  failed?: boolean;
};

export function HomeCategories({
  categories,
  failed = false,
}: HomeCategoriesProps) {
  const visibleCategories = selectCategories(categories);

  return (
    <section>
      <HomeSectionHeading
        title="Популярные категории"
        href="/categories/all"
        linkLabel="Все категории"
      />

      {failed ? (
        <div className="border border-border px-5 py-12 text-center text-sm text-muted-foreground">
          Не удалось загрузить категории. Попробуйте обновить страницу.
        </div>
      ) : visibleCategories.length === 0 ? (
        <div className="border border-border px-5 py-12 text-center text-sm text-muted-foreground">
          Категории пока не добавлены.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-4 sm:gap-x-5 lg:gap-x-6">
          {visibleCategories.map((category) => (
            <Link
              key={category.id}
              href={categoryHref(category.slug)}
              className="group min-w-0"
            >
              <div className="relative aspect-square overflow-hidden bg-[#f1f4f7]">
                {category.imageUrl ? (
                  // External category images come from the Products API.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-[1.025] sm:p-7"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl font-light text-foreground/15 sm:text-5xl">
                    {category.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="pt-3">
                <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-[#e73e69] sm:text-base">
                  {category.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Intl.NumberFormat("ru-RU").format(category.productCount)} товаров
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
