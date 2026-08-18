"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import { CartSheet } from "@/components/cart-sheet";
import { useCart } from "@/components/cart-provider";
import { FavoriteSheet } from "@/components/favorite-sheet";
import { useFavorites } from "@/components/favorites-provider";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#figures", label: "Фигурки" },
  { href: "/#tcg", label: "ККИ" },
  { href: "/#women-fashion", label: "Одежда" },
  { href: "/#bags", label: "Сумки" },
  { href: "/#watches", label: "Аксессуары" },
  { href: "/blog", label: "Блог" },
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

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-6 md:flex lg:gap-7"
          aria-label="Основное меню"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 text-base font-semibold text-[#111] transition-colors duration-200",
                "hover:text-[#F24676]",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

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
