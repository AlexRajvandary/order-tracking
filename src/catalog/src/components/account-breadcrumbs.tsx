"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
  "/favorites": "Избранное",
  "/cart": "Корзина",
};

export function AccountBreadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const currentTitle = TITLES[pathname] ?? "Личный кабинет";
  const isAccountPage = pathname.startsWith("/account");
  const isAccountHome = pathname === "/account";

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(isAccountHome ? "/" : "/account");
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] pr-6 pt-4 pb-5 sm:pr-10 sm:pb-6 lg:pr-12">
      <button type="button" onClick={goBack} className="mb-3 inline-flex items-center gap-2 rounded-md py-1 text-sm text-neutral-600 transition-colors hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Назад
      </button>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Главная</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {isAccountPage && !isAccountHome ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/account" />}>Личный кабинет</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>{currentTitle}</BreadcrumbPage></BreadcrumbItem>
            </>
          ) : <BreadcrumbItem><BreadcrumbPage>{currentTitle}</BreadcrumbPage></BreadcrumbItem>}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
