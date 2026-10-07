"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { useCustomerAccount } from "@/components/customer-account-provider";
import { useCustomerAccountData } from "@/components/use-customer-account-data";

function isEmail(value?: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function ProfileRow({ label, value }: { label: string; value?: React.ReactNode }) {
  const displayValue = typeof value === "string" ? value.trim() || "—" : value ?? "—";
  return (
    <div className="grid gap-1 border-b border-[#ececec] py-3.5 sm:grid-cols-[38%_62%] sm:gap-5">
      <dt className="text-sm font-normal text-[#737373]">{label}</dt>
      <dd className="break-words text-sm font-medium text-[#111]">{displayValue}</dd>
    </div>
  );
}

export default function AccountPage() {
  const { user, token, ready } = useCustomerAccount();
  const { profile, addresses, loading, error } = useCustomerAccountData(token);

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
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-4 sm:px-6 sm:py-8">
      <header className="border-b border-[#e6e6e6] pb-7 sm:pb-8">
        <h1 className="text-[32px] font-bold tracking-[-0.035em] text-[#111] sm:text-4xl">Личный кабинет</h1>
        <div className="mt-6">
          <p className="text-[22px] font-semibold tracking-tight text-[#171717]">{displayName}</p>
          <p className="mt-1 text-sm text-neutral-500">{email || "Email не указан"}</p>
        </div>
      </header>

      {loading ? <p className="mt-8 text-sm text-neutral-500">Загрузка данных…</p> : error ? <p role="alert" className="mt-8 text-sm text-destructive">{error}</p> : profile ? <>
        <section className="border-b border-[#e6e6e6] py-8 sm:py-9">
          <h2 className="text-xl font-semibold tracking-tight text-[#171717]">Контактные данные</h2>
          <dl className="mt-3">
            <ProfileRow label="Имя" value={profile.name?.trim() || user.displayName?.trim() || "—"} />
            <ProfileRow label="Email" value={email || "—"} />
            <ProfileRow label="Телефон" value={profile.phone} />
            <ProfileRow label="Telegram для связи" value={profile.contactTelegram} />
            <ProfileRow label="WhatsApp" value={profile.whatsApp} />
            <ProfileRow label="VK" value={profile.vk} />
            <ProfileRow label="Telegram аккаунт" value={profile.telegramLinked ? (
              <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-[#edf5ee] px-3 text-xs font-medium text-[#426b49]"><span className="size-1.5 rounded-full bg-[#6d9874]" aria-hidden="true" />Подключён</span>
            ) : (
              <span className="inline-flex h-[30px] items-center rounded-full bg-[#f1f1f0] px-3 text-xs font-medium text-[#696969]">Не подключён</span>
            )} />
          </dl>
          <Link href="/account/settings#contact" className="group mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#111] transition-opacity duration-200 hover:opacity-70">
            Изменить данные <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-[3px]" aria-hidden="true" />
          </Link>
        </section>

        <section className="py-8 sm:py-9">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-[#171717]">Адрес</h2>
            <Link href="/account/settings#addresses" className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#222] transition-opacity duration-200 hover:opacity-70">
              Управлять адресами <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-[3px]" aria-hidden="true" />
            </Link>
          </div>
          {firstAddress ? (
            <div className="mt-5 flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f3f3f2] text-[#454545]">
                <MapPin className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium leading-6 text-[#222]">{addressText || "—"}</p>
                {firstAddress.postalCode ? <p className="mt-0.5 text-neutral-500">{firstAddress.postalCode}</p> : null}
                {firstAddress.note ? <p className="mt-1 text-neutral-500">{firstAddress.note}</p> : null}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-neutral-500">Адрес не добавлен</p>
              <Link href="/account/settings#addresses" className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#111] transition-opacity duration-200 hover:opacity-70">
                Добавить адрес <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-[3px]" aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      </> : <p className="mt-8 text-sm text-neutral-500">Данные профиля пока недоступны.</p>}
    </main>
  );
}
