import Link from "next/link";
import { HomeSectionHeading } from "@/components/home/home-section-heading";
import type { ApiShop } from "@/lib/shops-api";

const preferredShops = [
  "zozotown",
  "mercari",
  "rakuten",
  "yahoo-auctions",
  "amazon-japan",
  "suruga-ya",
];

function selectShops(shops: ApiShop[]): ApiShop[] {
  const active = shops.filter((shop) => shop.isActive);
  const selected = preferredShops
    .map((slug) => active.find((shop) => shop.slug === slug))
    .filter((shop): shop is ApiShop => Boolean(shop));

  for (const shop of active) {
    if (selected.length >= 6) break;
    if (!selected.some((item) => item.id === shop.id)) selected.push(shop);
  }

  return selected.slice(0, 6);
}

type HomeShopsProps = {
  shops: ApiShop[];
  failed?: boolean;
};

export function HomeShops({ shops, failed = false }: HomeShopsProps) {
  const visibleShops = selectShops(shops);

  return (
    <section>
      <HomeSectionHeading title="Магазины Японии" />
      {failed ? (
        <div className="border border-border px-5 py-12 text-center text-sm text-muted-foreground">
          Не удалось загрузить магазины. Попробуйте обновить страницу.
        </div>
      ) : visibleShops.length === 0 ? (
        <div className="border border-border px-5 py-12 text-center text-sm text-muted-foreground">
          Магазины пока не добавлены.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {visibleShops.map((shop) => (
            <Link
              key={shop.id}
              href={`/categories/all?shops=${encodeURIComponent(shop.slug)}`}
              className="group flex min-h-32 flex-col justify-between border border-border bg-background p-4 transition-colors hover:border-foreground/30"
            >
              <span className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                Japan
              </span>
              <h3 className="mt-6 text-base leading-5 font-medium tracking-[-0.02em] text-foreground transition-colors group-hover:text-[#e73e69]">
                {shop.name}
              </h3>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
