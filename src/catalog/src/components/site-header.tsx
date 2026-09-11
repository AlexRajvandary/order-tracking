"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import { CartSheet } from "@/components/cart-sheet";
import { useCart } from "@/components/cart-provider";
import { FavoriteSheet } from "@/components/favorite-sheet";
import { useFavorites } from "@/components/favorites-provider";
import { categoryHref, type ApiCategory } from "@/lib/categories-api";
import { cn } from "@/lib/utils";

const MEGA_MENU_ITEMS = ["Категории", "Бренды", "Магазины"] as const;

type MegaMenuItem = (typeof MEGA_MENU_ITEMS)[number];

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

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<MegaMenuItem | null>(null);
  const [categories, setCategories] = useState<ApiCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoriesRetry, setCategoriesRetry] = useState(0);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const categoriesRequestStarted = useRef(false);

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
              <div className="mx-auto min-h-72 max-h-[calc(100dvh-7rem)] w-full max-w-[1440px] overflow-y-auto px-8 py-8 lg:px-10">
                {activeMegaMenu === "Категории" ? (
                  categories ? (
                    categories.length > 0 ? (
                      <div className="grid grid-cols-3 gap-x-10 gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
                        {categories.map((category) => (
                          <section key={category.id} className="min-w-0">
                            <Link
                              href={categoryHref(category.slug)}
                              className="block text-[15px] font-semibold leading-5 text-[#111] transition-colors hover:text-[#F24676]"
                              onClick={() => setActiveMegaMenu(null)}
                            >
                              {category.name}
                            </Link>
                            {category.children.length > 0 ? (
                              <ul className="mt-3 space-y-2">
                                {category.children.map((child) => (
                                  <li key={child.id}>
                                    <Link
                                      href={categoryHref(category.slug, child.slug)}
                                      className="block text-sm leading-5 text-[#666] transition-colors hover:text-[#111]"
                                      onClick={() => setActiveMegaMenu(null)}
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </section>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#777]">Категории не найдены</p>
                    )
                  ) : categoriesError ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-[#555] underline underline-offset-4 hover:text-[#111]"
                      onClick={() => {
                        categoriesRequestStarted.current = false;
                        setCategoriesError(false);
                        setCategoriesRetry((value) => value + 1);
                      }}
                    >
                      Не удалось загрузить категории. Повторить
                    </button>
                  ) : (
                    <div
                      className="grid grid-cols-3 gap-x-10 gap-y-8 lg:grid-cols-4 xl:grid-cols-5"
                      aria-label="Загрузка категорий"
                    >
                      {Array.from({ length: 10 }, (_, index) => (
                        <div key={index} className="space-y-3">
                          <div className="h-5 w-3/4 animate-pulse rounded bg-[#ECEEF1]" />
                          <div className="h-4 w-full animate-pulse rounded bg-[#F2F3F5]" />
                          <div className="h-4 w-5/6 animate-pulse rounded bg-[#F2F3F5]" />
                          <div className="h-4 w-2/3 animate-pulse rounded bg-[#F2F3F5]" />
                        </div>
                      ))}
                    </div>
                  )
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
