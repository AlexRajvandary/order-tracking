"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const TITLES: Record<string, string> = {
  "/account": "Личный кабинет",
  "/account/orders": "Заказы",
  "/account/settings": "Настройки",
  "/account/telegram/callback": "Вход через Telegram",
};

export function AccountBreadcrumbs() {
  const pathname = usePathname();
  const currentTitle = TITLES[pathname] ?? "Личный кабинет";
  const isHome = pathname === "/account";

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pt-4 pb-5 sm:px-8 sm:pb-6 lg:px-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Главная</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {isHome ? (
            <BreadcrumbItem><BreadcrumbPage>{currentTitle}</BreadcrumbPage></BreadcrumbItem>
          ) : (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/account" />}>Личный кабинет</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>{currentTitle}</BreadcrumbPage></BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
