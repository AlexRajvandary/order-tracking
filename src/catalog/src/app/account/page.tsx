"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCustomerAccount } from "@/components/customer-account-provider";
import { useFavorites } from "@/components/favorites-provider";
import { useCustomerAccountData } from "@/components/use-customer-account-data";

function isEmail(value?: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function formatFavoriteCount(count: number) {
  const form = new Intl.PluralRules("ru").select(count);
  const noun = form === "one" ? "товар" : form === "few" ? "товара" : "товаров";
  return `${count} сохранённых ${noun}`;
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[minmax(140px,0.8fr)_1.2fr] sm:gap-5">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-[#222]">{value?.trim() || "Не указано"}</dd>
    </div>
  );
}

export default function AccountPage() {
  const { user, token, ready } = useCustomerAccount();
  const { profile, addresses, loading, error } = useCustomerAccountData(token);
  const { ids: favoriteIds, ready: favoritesReady } = useFavorites();

  if (!ready) return <main className="mx-auto w-full max-w-[820px] flex-1 px-4 py-8 text-sm text-neutral-500">Загрузка…</main>;
  if (!user) return (
    <main className="mx-auto w-full max-w-[820px] flex-1 px-4 py-8">
      <h1 className="text-[30px] font-semibold tracking-tight text-[#171717] sm:text-[34px]">Личный кабинет</h1>
      <p className="mt-3 text-sm text-neutral-600">Войдите или создайте кабинет, чтобы отслеживать заявки.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="inline-flex h-11 items-center rounded-lg bg-black px-5 text-sm font-medium text-white" href="/login">Войти</Link>
        <Link className="inline-flex h-11 items-center rounded-lg border px-5 text-sm font-medium" href="/register">Регистрация</Link>
      </div>
    </main>
  );

  const displayName = profile?.name?.trim() || user.displayName?.trim() || "Не указано";
  const email = isEmail(profile?.email) ? profile?.email : isEmail(user.login) ? user.login : "";
  const firstAddress = addresses[0];
  const addressText = firstAddress
    ? [firstAddress.city, firstAddress.street, firstAddress.building, firstAddress.apartment ? `кв. ${firstAddress.apartment}` : null].filter(Boolean).join(", ")
    : "Адрес не добавлен";

  return (
    <main className="mx-auto w-full max-w-[820px] flex-1 px-4 py-4 sm:px-6 sm:py-8">
      <h1 className="text-[30px] font-semibold tracking-tight text-[#171717] sm:text-[34px]">Личный кабинет</h1>
      <div className="mt-5">
        <p className="text-xl font-semibold text-[#171717]">{displayName}</p>
        <p className="mt-1 text-sm text-neutral-500">{email || "Email не указан"}</p>
      </div>

      {loading ? <p className="mt-8 text-sm text-neutral-500">Загрузка данных…</p> : error ? <p role="alert" className="mt-8 text-sm text-destructive">{error}</p> : profile ? <>
        <section className="mt-8 border-t border-[#e7e7e7] pt-7">
          <h2 className="text-lg font-semibold tracking-tight text-[#171717]">Контактные данные</h2>
          <dl className="mt-3 divide-y divide-[#ededed]">
            <ProfileRow label="Имя" value={profile.name || user.displayName} />
            <ProfileRow label="Email" value={email || "Email не привязан"} />
            <ProfileRow label="Телефон" value={profile.phone} />
            <ProfileRow label="Telegram для связи" value={profile.contactTelegram} />
            <ProfileRow label="WhatsApp" value={profile.whatsApp} />
            <ProfileRow label="VK" value={profile.vk} />
            <ProfileRow label="Telegram аккаунт" value={profile.telegramLinked ? "Привязан" : "Не привязан"} />
          </dl>
          <Link href="/account/settings" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#222] hover:underline">Изменить данные <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </section>

        <section className="mt-7 border-t border-[#e7e7e7] pt-7">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-[#171717]">Адрес</h2>
            <Link href="/account/settings" className="text-sm font-medium text-[#222] hover:underline">Управлять адресами <span aria-hidden="true">→</span></Link>
          </div>
          <p className="mt-3 text-sm text-neutral-600">{addressText}</p>
          {firstAddress?.postalCode ? <p className="mt-1 text-sm text-neutral-500">{firstAddress.postalCode}</p> : null}
          {firstAddress?.note ? <p className="mt-1 text-sm text-neutral-500">{firstAddress.note}</p> : null}
        </section>
      </> : <p className="mt-8 text-sm text-neutral-500">Данные профиля пока недоступны.</p>}

      <nav aria-label="Другие разделы кабинета" className="mt-7 border-t border-[#e7e7e7]">
        <Link href="/account/orders" className="group flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e7e7] py-5 transition-colors hover:bg-[#f5f5f5]">
          <span><span className="block font-medium text-[#171717]">Заказы</span><span className="mt-1 block text-sm text-neutral-500">История и статусы ваших заявок</span></span>
          <ArrowRight className="size-4 text-neutral-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
        <Link href="/favorites" className="group flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e7e7] py-5 transition-colors hover:bg-[#f5f5f5]">
          <span><span className="block font-medium text-[#171717]">Избранное</span><span className="mt-1 block text-sm text-neutral-500">{favoritesReady ? formatFavoriteCount(favoriteIds.length) : "Сохранённые товары"}</span></span>
          <ArrowRight className="size-4 text-neutral-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
        <Link href="/account/settings" className="group flex flex-wrap items-center justify-between gap-3 py-5 transition-colors hover:bg-[#f5f5f5]">
          <span><span className="block font-medium text-[#171717]">Настройки</span><span className="mt-1 block text-sm text-neutral-500">Контакты, безопасность, уведомления и адреса</span></span>
          <ArrowRight className="size-4 text-neutral-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </nav>
    </main>
  );
}
