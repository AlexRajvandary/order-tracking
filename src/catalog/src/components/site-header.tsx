"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, User } from "lucide-react";
import { CartSheet } from "@/components/cart-sheet";
import { useCart } from "@/components/cart-provider";
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
      className="group relative inline-flex flex-col items-center gap-1 text-[#555] transition-transform duration-200 hover:-translate-y-px"
    >
      <span className="relative inline-flex size-6 items-center justify-center">
        <Icon className="size-6 stroke-[1.6]" aria-hidden />
        {typeof badge === "number" && badge > 0 ? (
          <span className="absolute -top-2 -right-2.5 flex size-[18px] items-center justify-center rounded-full bg-[#F24676] text-[10px] leading-none font-semibold text-white">
            {badge > 99 ? "99" : badge}
          </span>
        ) : null}
      </span>
      <span className="text-xs leading-none text-[#555] transition-colors duration-200 group-hover:text-[#F24676]">
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
          className="group relative inline-flex flex-col items-center gap-1 text-[#555] transition-transform duration-200 hover:-translate-y-px"
          aria-label="Корзина"
        >
          <span className="relative inline-flex size-6 items-center justify-center">
            <ShoppingBag className="size-6 stroke-[1.6]" aria-hidden />
            {itemCount > 0 ? (
              <span className="absolute -top-2 -right-2.5 flex size-[18px] items-center justify-center rounded-full bg-[#F24676] text-[10px] leading-none font-semibold text-white">
                {itemCount > 99 ? "99" : itemCount}
              </span>
            ) : null}
          </span>
          <span className="text-xs leading-none text-[#555] transition-colors duration-200 group-hover:text-[#F24676]">
            Корзина
          </span>
        </button>
      }
    />
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#ECECEC] bg-white">
      <div className="mx-auto flex h-[78px] w-full max-w-6xl items-center gap-5 px-4 sm:gap-6 sm:px-5 lg:px-6">
        <Link
          href="/"
          className="ml-1 inline-flex shrink-0 items-center"
          aria-label="The Get"
        >
          <Image
            src="/thegetlogo.png"
            alt="The Get"
            width={160}
            height={160}
            className="h-[54px] w-auto"
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

        <div className="ml-auto flex items-center gap-6 lg:ml-0 lg:gap-7">
          <HeaderIconButton href="/favorites" label="Избранное" icon={Heart} />
          <CartIconButton />
          <HeaderIconButton href="/login" label="Войти" icon={User} />
        </div>
      </div>
    </header>
  );
}
