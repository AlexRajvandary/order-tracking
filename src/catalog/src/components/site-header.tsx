"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Gavel,
  Heart,
  Headphones,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  Ticket,
  User,
  X,
} from "lucide-react";
import { CartSheet } from "@/components/cart-sheet";
import { useCart } from "@/components/cart-provider";
import { FavoriteSheet } from "@/components/favorite-sheet";
import { useFavorites } from "@/components/favorites-provider";
import type { ApiBrand } from "@/lib/brands-api";
import { categoryHref, type ApiCategory } from "@/lib/categories-api";
import type { CatalogProduct } from "@/lib/catalog-products";
import {
  mapApiProductToCatalog,
  type ApiProductListResult,
} from "@/lib/products-api";
import { formatPrice } from "@/lib/products";
import { cn } from "@/lib/utils";

const MEGA_MENU_ITEMS = ["Категории", "Бренды", "Магазины"] as const;

type MegaMenuItem = (typeof MEGA_MENU_ITEMS)[number];

const CATEGORY_SERVICES = [
  {
    href: "/individual-request",
    title: "Индивидуальный запрос",
    description: "Не нашли нужный товар? Найдём его для вас в Японии",
    icon: MessageCircle,
  },
  {
    href: "/auction-request",
    title: "Аукцион",
    description: "Пришлите ссылку на лот и максимальную ставку",
    icon: Gavel,
  },
  {
    href: "/ticket-request",
    title: "Билеты",
    description: "Поможем найти и приобрести билеты на события в Японии",
    icon: Ticket,
  },
  {
    href: "/contact",
    title: "Контакты",
    description: "Telegram, WhatsApp и поддержка",
    icon: Headphones,
  },
  {
    href: "/item-weight",
    title: "Справочная информация",
    description: "Доставка, вес, сроки и полезная информация",
    icon: FileText,
  },
] as const;

const megaMenuProductsCache = new Map<string, CatalogProduct[]>();

function categoryShopSlug(category: Pick<ApiCategory, "name" | "slug">): string | null {
  const normalizedName = category.name.trim().toLocaleLowerCase("ru");
  return category.slug === "clothing" ||
    category.slug === "bags" ||
    normalizedName === "одежда" ||
    normalizedName === "сумки"
    ? "zozotown"
    : null;
}

function categoryCatalogHref(category: Pick<ApiCategory, "name" | "slug">): string {
  const href = categoryHref(category.slug);
  const shopSlug = categoryShopSlug(category);
  return shopSlug ? `${href}?shops=${encodeURIComponent(shopSlug)}` : href;
}

const NAV_LINKS = [
  { href: "https://yandex.ru/profile/85406102943", label: "Отзывы" },
  { href: "https://theget.ru/media", label: "Издание" },
  { href: "https://theget.ru/aboutus", label: "О нас" },
] as const;

function HeaderIconButton({
  href,
  label,
  icon: Icon,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof Heart;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative inline-flex flex-col items-center gap-0.5 text-[#555] transition-transform duration-200 hover:-translate-y-px sm:gap-1"
      aria-label={label}
    >
      <span className="relative inline-flex size-5 items-center justify-center sm:size-6">
        <Icon className="size-5 stroke-[1.6] sm:size-6" aria-hidden />
        {typeof badge === "number" && badge > 0 ? (
          <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-[#F24676] text-[9px] leading-none font-semibold text-white sm:size-[18px] sm:text-[10px]">
            {badge > 99 ? "99" : badge}
          </span>
        ) : null}
      </span>
      <span className="hidden text-xs leading-none text-[#555] transition-colors duration-200 group-hover:text-[#F24676] sm:inline">
        {label}
      </span>
    </Link>
  );
}

function CartIconButton() {
  const { itemCount } = useCart();

  return (
    <CartSheet
      trigger={
        <button
          type="button"
          className="group relative inline-flex flex-col items-center gap-0.5 text-[#555] transition-transform duration-200 hover:-translate-y-px sm:gap-1"
          aria-label="Корзина"
        >
          <span className="relative inline-flex size-5 items-center justify-center sm:size-6">
            <ShoppingBag className="size-5 stroke-[1.6] sm:size-6" aria-hidden />
            {itemCount > 0 ? (
              <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-[#F24676] text-[9px] leading-none font-semibold text-white sm:size-[18px] sm:text-[10px]">
                {itemCount > 99 ? "99" : itemCount}
              </span>
            ) : null}
          </span>
          <span className="hidden text-xs leading-none text-[#555] transition-colors duration-200 group-hover:text-[#F24676] sm:inline">
            Корзина
          </span>
        </button>
      }
    />
  );
}

function FavoriteIconButton() {
  const { ids } = useFavorites();

  return (
    <FavoriteSheet
      trigger={
        <button
          type="button"
          className="group relative inline-flex flex-col items-center gap-0.5 text-[#555] transition-transform duration-200 hover:-translate-y-px sm:gap-1"
          aria-label="Избранное"
        >
          <span className="relative inline-flex size-5 items-center justify-center sm:size-6">
            <Heart className="size-5 stroke-[1.6] sm:size-6" aria-hidden />
            {ids.length > 0 ? (
              <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-[#F24676] text-[9px] leading-none font-semibold text-white sm:size-[18px] sm:text-[10px]">
                {ids.length > 99 ? "99" : ids.length}
              </span>
            ) : null}
          </span>
          <span className="hidden text-xs leading-none text-[#555] transition-colors duration-200 group-hover:text-[#F24676] sm:inline">
            Избранное
          </span>
        </button>
      }
    />
  );
}

function PopularCategoryProducts({
  category,
  onNavigate,
}: {
  category: ApiCategory;
  onNavigate: () => void;
}) {
  const shopSlug = categoryShopSlug(category);
  const cacheKey = `${category.slug}:${shopSlug ?? "all"}`;
  const cachedProducts = megaMenuProductsCache.get(cacheKey);
  const [requestState, setRequestState] = useState<{
    key: string;
    products: CatalogProduct[];
    loading: boolean;
    error: boolean;
  }>(() => ({
    key: cacheKey,
    products: cachedProducts ?? [],
    loading: !cachedProducts,
    error: false,
  }));

  useEffect(() => {
    const cached = megaMenuProductsCache.get(cacheKey);
    if (cached) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      page: "1",
      pageSize: "5",
      category: category.slug,
      includeCategoryChildren: "true",
    });
    if (shopSlug) params.set("shops", shopSlug);

    void fetch(`/api/catalog-products?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as ApiProductListResult;
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        const products = result.items
          .slice(0, 5)
          .map((product) =>
            mapApiProductToCatalog(
              product,
              category.slug,
              product.categorySlug ?? category.slug,
              product.categoryName ?? category.name,
            ),
          );
        megaMenuProductsCache.set(cacheKey, products);
        setRequestState({ key: cacheKey, products, loading: false, error: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load mega menu products", error);
        setRequestState({ key: cacheKey, products: [], loading: false, error: true });
      });

    return () => controller.abort();
  }, [cacheKey, category.name, category.slug, shopSlug]);

  const isCurrentRequest = requestState.key === cacheKey;
  const loading = !isCurrentRequest || requestState.loading;
  const products = isCurrentRequest ? requestState.products : [];
  const error = isCurrentRequest && requestState.error;

  return (
    <section className="mt-7 border-t border-[#ECECEC] pt-5" aria-label="Популярные товары">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-[#111]">Популярные товары в категории</h3>
        <Link
          href={categoryCatalogHref(category)}
          className="shrink-0 text-sm font-medium text-[#F24676] transition-colors hover:text-[#D92F5E]"
          onClick={onNavigate}
        >
          Смотреть всё →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-3" aria-label="Загрузка товаров">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="min-w-0">
              <div className="aspect-[4/3] animate-pulse bg-[#ECEEF1]" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#ECEEF1]" />
              <div className="mt-2 h-8 animate-pulse rounded bg-[#F2F3F5]" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-[#ECEEF1]" />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-5 gap-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group min-w-0"
              onClick={onNavigate}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#F2F3F5]">
                {product.imageUrl ? (
                  // Product images can be hosted by external stores or MinIO.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                ) : null}
              </div>
              <p className="mt-2 truncate text-[9px] leading-3 font-semibold tracking-[0.06em] text-[#858B95] uppercase">
                {product.brand ?? "\u00A0"}
              </p>
              <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-[18px] font-medium text-[#252A33]">
                {product.name}
              </p>
              <p className="mt-1.5 text-sm font-bold tracking-tight text-[#111]">
                {formatPrice(product)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#888]">
          {error ? "Не удалось загрузить товары" : "Нет товаров в этой категории"}
        </p>
      )}
    </section>
  );
}

function CategoryMegaMenu({
  categories,
  error,
  onRetry,
  onNavigate,
}: {
  categories: ApiCategory[] | null;
  error: boolean;
  onRetry: () => void;
  onNavigate: () => void;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const activeCategory =
    categories?.find((category) => category.id === activeCategoryId) ?? categories?.[0];

  if (error) {
    return (
      <button
        type="button"
        className="text-sm font-medium text-[#555] underline underline-offset-4 hover:text-[#111]"
        onClick={onRetry}
      >
        Не удалось загрузить категории. Повторить
      </button>
    );
  }

  if (!categories) {
    return (
      <div
        className="grid grid-cols-[minmax(220px,0.32fr)_minmax(0,1fr)] gap-10"
        aria-label="Загрузка категорий"
      >
        <div className="space-y-2 border-r border-[#ECECEC] pr-8">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-[#ECEEF1]" />
          ))}
        </div>
        <div>
          <div className="mb-5 h-5 w-40 animate-pulse rounded bg-[#ECEEF1]" />
          <div className="grid grid-cols-2 gap-x-10 gap-y-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="h-4 animate-pulse rounded bg-[#F2F3F5]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return <p className="text-sm text-[#777]">Категории не найдены</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-[minmax(220px,0.32fr)_minmax(0,1fr)] gap-10">
        <section
          className="border-r border-[#ECECEC] pr-8"
          aria-label="Категории первого уровня"
        >
          <div className="space-y-1">
            {categories.map((category) => {
              const active = category.id === activeCategory?.id;
              return (
                <Link
                  key={category.id}
                  href={categoryHref(category.slug)}
                  className={cn(
                    "flex min-h-10 items-center rounded-lg border px-3 py-2 text-[15px] font-semibold leading-5 transition-colors",
                    active
                      ? "border-[#D9DCE1] bg-[#F1F2F4] text-[#2F3540]"
                      : "border-transparent text-[#111] hover:bg-[#F7F7F8] hover:text-[#F24676]",
                  )}
                  onMouseEnter={() => setActiveCategoryId(category.id)}
                  onFocus={() => setActiveCategoryId(category.id)}
                  onClick={onNavigate}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="min-w-0" aria-label="Подкатегории">
          <h2 className="mb-5 text-base font-semibold text-[#111]">
            {activeCategory?.name}
          </h2>
          {activeCategory?.children.length ? (
            <div className="grid grid-cols-2 gap-x-10 gap-y-4 lg:grid-cols-3 xl:grid-cols-4">
              {activeCategory.children.map((child) => (
                <Link
                  key={child.id}
                  href={categoryHref(activeCategory.slug, child.slug)}
                  className="text-sm leading-5 text-[#666] transition-colors hover:text-[#F24676]"
                  onClick={onNavigate}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#888]">Подкатегории отсутствуют</p>
          )}
          {activeCategory ? (
            <PopularCategoryProducts
              key={activeCategory.id}
              category={activeCategory}
              onNavigate={onNavigate}
            />
          ) : null}
        </section>
      </div>

      <nav
        className="mt-7 grid grid-cols-3 gap-3 border-t border-[#E4E5E8] pt-6 lg:grid-cols-5"
        aria-label="Сервисы The Get"
      >
        {CATEGORY_SERVICES.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-[108px] items-start gap-3 rounded-xl border border-[#E5E6E9] bg-white p-3.5 transition-[background-color,border-color] duration-200 hover:border-[#E8C9D2] hover:bg-[#FFF8FA]"
            onClick={onNavigate}
          >
            <Icon className="mt-0.5 size-[18px] shrink-0 text-[#555C67]" strokeWidth={1.7} aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col self-stretch">
              <span className="text-sm leading-5 font-semibold text-[#252A33]">{title}</span>
              <span className="mt-1 text-xs leading-[17px] text-[#7A808A]">{description}</span>
            </span>
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#F24676] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}

function BrandMegaMenu({
  brands,
  error,
  onRetry,
  onNavigate,
}: {
  brands: ApiBrand[] | null;
  error: boolean;
  onRetry: () => void;
  onNavigate: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ru");
  const visibleBrands = brands
    ?.filter((brand) => brand.name.toLocaleLowerCase("ru").includes(normalizedQuery))
    .sort((left, right) => left.name.localeCompare(right.name, ["ru", "en"]));

  if (error) {
    return (
      <button
        type="button"
        className="text-sm font-medium text-[#555] underline underline-offset-4 hover:text-[#111]"
        onClick={onRetry}
      >
        Не удалось загрузить бренды. Повторить
      </button>
    );
  }

  return (
    <div className="flex max-h-[calc(50dvh-4rem)] min-h-0 flex-col">
      <label className="relative block max-w-xl shrink-0">
        <span className="sr-only">Поиск брендов</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#8B919C]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск брендов"
          className="h-12 w-full rounded-xl border border-[#D9DCE1] bg-white pr-4 pl-12 text-[15px] text-[#111] outline-none transition-colors placeholder:text-[#9CA1AA] focus:border-[#3F4652]"
        />
      </label>

      <div className="mt-7 min-h-0 overflow-y-auto border-t border-[#ECECEC] pt-6 pr-2">
        {!brands ? (
          <div
            className="grid grid-cols-3 gap-x-10 gap-y-4 lg:grid-cols-4 xl:grid-cols-6"
            aria-label="Загрузка брендов"
          >
            {Array.from({ length: 18 }, (_, index) => (
              <div key={index} className="h-5 animate-pulse rounded bg-[#ECEEF1]" />
            ))}
          </div>
        ) : visibleBrands?.length ? (
          <div className="grid grid-cols-3 gap-x-10 gap-y-4 lg:grid-cols-4 xl:grid-cols-6">
            {visibleBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`/categories/all?brands=${encodeURIComponent(brand.slug)}`}
                className="truncate text-[15px] font-medium text-[#333842] transition-colors hover:text-[#F24676]"
                title={brand.name}
                onClick={onNavigate}
              >
                {brand.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#777]">Бренды не найдены</p>
        )}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<MegaMenuItem | null>(null);
  const [categories, setCategories] = useState<ApiCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoriesRetry, setCategoriesRetry] = useState(0);
  const [brands, setBrands] = useState<ApiBrand[] | null>(null);
  const [brandsError, setBrandsError] = useState(false);
  const [brandsRetry, setBrandsRetry] = useState(0);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const categoriesRequestStarted = useRef(false);
  const brandsRequestStarted = useRef(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!activeMegaMenu) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveMegaMenu(null);
    };
    const closeOutside = (event: PointerEvent) => {
      if (!megaMenuRef.current?.contains(event.target as Node)) {
        setActiveMegaMenu(null);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [activeMegaMenu]);

  useEffect(() => {
    if (
      activeMegaMenu !== "Категории" ||
      categories !== null ||
      categoriesRequestStarted.current
    ) {
      return;
    }

    categoriesRequestStarted.current = true;
    setCategoriesError(false);
    void fetch("/api/catalog-categories")
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { items?: ApiCategory[] };
      })
      .then((data) => setCategories(data.items ?? []))
      .catch(() => {
        categoriesRequestStarted.current = false;
        setCategoriesError(true);
      });
  }, [activeMegaMenu, categories, categoriesRetry]);

  useEffect(() => {
    if (
      activeMegaMenu !== "Бренды" ||
      brands !== null ||
      brandsRequestStarted.current
    ) {
      return;
    }

    brandsRequestStarted.current = true;
    setBrandsError(false);
    void fetch("/api/catalog-brands")
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { items?: ApiBrand[] };
      })
      .then((data) => setBrands(data.items ?? []))
      .catch(() => {
        brandsRequestStarted.current = false;
        setBrandsError(true);
      });
  }, [activeMegaMenu, brands, brandsRetry]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#ECECEC] bg-white/95 backdrop-blur-md supports-backdrop-filter:bg-white/90">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-6 sm:h-[78px] sm:gap-6 sm:px-8 lg:px-10">
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[#111] transition-colors hover:bg-black/5 md:hidden"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <X className="size-6" strokeWidth={1.8} />
          ) : (
            <Menu className="size-6" strokeWidth={1.8} />
          )}
        </button>

        <Link
          href="/"
          className="inline-flex shrink-0 items-center"
          aria-label="The Get"
          onClick={() => setMenuOpen(false)}
        >
          <Image
            src="/thegetlogo.png"
            alt="The Get"
            width={160}
            height={160}
            className="h-10 w-auto sm:h-[54px]"
            priority
          />
        </Link>

        <div
          ref={megaMenuRef}
          className="hidden min-w-0 flex-1 self-stretch md:flex"
          onMouseLeave={() => setActiveMegaMenu(null)}
        >
          <nav
            className="flex min-w-0 flex-1 items-center justify-center gap-6 lg:gap-7"
            aria-label="Основное меню"
          >
            {MEGA_MENU_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 text-base font-semibold text-[#111] transition-colors duration-200 hover:text-[#F24676]",
                  activeMegaMenu === item && "text-[#F24676]",
                )}
                aria-expanded={activeMegaMenu === item}
                aria-controls="header-mega-menu"
                onMouseEnter={() => setActiveMegaMenu(item)}
                onFocus={() => setActiveMegaMenu(item)}
                onClick={() =>
                  setActiveMegaMenu((current) => (current === item ? null : item))
                }
              >
                {item}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform duration-200",
                    activeMegaMenu === item && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            ))}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 text-base font-semibold text-[#111] transition-colors duration-200 hover:text-[#F24676]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {activeMegaMenu ? (
            <div
              id="header-mega-menu"
              className="absolute inset-x-0 top-full border-b border-[#E6E6E6] bg-white shadow-[0_18px_35px_rgba(0,0,0,0.10)]"
              role="region"
              aria-label={activeMegaMenu}
            >
              <div
                className={cn(
                  "mx-auto w-full max-w-[1440px] px-8 py-8 lg:px-10",
                  activeMegaMenu === "Бренды"
                    ? "max-h-[50dvh] overflow-hidden"
                    : "min-h-72 max-h-[calc(100dvh-7rem)] overflow-y-auto",
                )}
              >
                {activeMegaMenu === "Категории" ? (
                  <CategoryMegaMenu
                    categories={categories}
                    error={categoriesError}
                    onNavigate={() => setActiveMegaMenu(null)}
                    onRetry={() => {
                      categoriesRequestStarted.current = false;
                      setCategoriesError(false);
                      setCategoriesRetry((value) => value + 1);
                    }}
                  />
                ) : null}
                {activeMegaMenu === "Бренды" ? (
                  <BrandMegaMenu
                    brands={brands}
                    error={brandsError}
                    onNavigate={() => setActiveMegaMenu(null)}
                    onRetry={() => {
                      brandsRequestStarted.current = false;
                      setBrandsError(false);
                      setBrandsRetry((value) => value + 1);
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-4 sm:gap-6 lg:gap-7">
          <FavoriteIconButton />
          <CartIconButton />
          <HeaderIconButton href="/login" label="Войти" icon={User} />
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 top-14 z-30 md:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-black/35"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            aria-label="Мобильное меню"
            className="absolute inset-x-0 top-0 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-[#ECECEC] bg-white px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
          >
            <ul className="flex flex-col">
              {MEGA_MENU_ITEMS.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between border-b border-[#F0F0F0] py-3.5 text-left text-[16px] font-semibold text-[#111] active:text-[#F24676]"
                  >
                    {item}
                    <ChevronDown className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center border-b border-[#F0F0F0] py-3.5 text-[16px] font-semibold text-[#111] last:border-b-0 active:text-[#F24676]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
