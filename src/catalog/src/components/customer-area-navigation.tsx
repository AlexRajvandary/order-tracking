"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Heart, ShoppingBag, SlidersHorizontal, UserRound } from "lucide-react";

const items = [
  { href: "/account", label: "Профиль", icon: UserRound },
  { href: "/account/orders", label: "Заказы", icon: ClipboardList },
  { href: "/favorites", label: "Избранное", icon: Heart },
  { href: "/cart", label: "Корзина", icon: ShoppingBag },
  { href: "/account/settings", label: "Настройки", icon: SlidersHorizontal },
];

export function CustomerAreaNavigation() {
  const pathname = usePathname();
  const isFavoritesOrCart = pathname === "/favorites" || pathname === "/cart";

  return (
    <nav aria-label="Разделы личного кабинета" className={`min-w-0 ${isFavoritesOrCart ? "lg:pt-6" : "lg:pt-8"}`}>
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:rounded-xl lg:border lg:bg-card lg:p-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`));
          return (
            <li key={href} className="shrink-0 lg:w-full">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
