"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCustomerAccount } from "@/components/customer-account-provider";
import { useCustomerAccountData, type CustomerAddressData } from "@/components/use-customer-account-data";

const inputClass = "mt-2 h-12 w-full rounded-lg border border-[#dededb] bg-white px-3.5 text-[15px] outline-none transition focus:border-neutral-800 focus:ring-2 focus:ring-neutral-900/10";
const secondaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#dcdcdc] bg-white px-5 text-sm font-medium text-[#222] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white transition hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50";

function SettingsSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 py-8 first:pt-0 sm:py-10">
      <h2 className="text-xl font-semibold tracking-tight text-[#171717]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AccountSettingsPage() {
  const { token, user, logout } = useCustomerAccount();
  const { profile, setProfile, addresses, setAddresses, loading: accountDataLoading, error: accountDataError } = useCustomerAccountData(token);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);

  const api = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`/api/v1/customer-account/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || payload.title || "Не удалось сохранить изменения");
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  }, [token]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    try {
      await api("profile", { method: "PUT", body: JSON.stringify({
        name: form.get("name"), phone: form.get("phone"), telegram: form.get("telegram"),
        whatsApp: form.get("whatsApp"), vk: form.get("vk"),
      }) });
      setNotice("Контактные данные сохранены.");
      setError("");
    } catch (reason) { setError((reason as Error).message); }
  }

  async function toggleNotifications() {
    if (!profile) return;
    try {
      const enabled = !profile.notificationsEnabled;
      await api("notifications", { method: "PUT", body: JSON.stringify({ enabled }) });
      setProfile({ ...profile, notificationsEnabled: enabled });
    } catch (reason) { setError((reason as Error).message); }
  }

  async function linkTelegram() {
    try {
      const result = await api<{ authorizationUrl: string }>("telegram/link/start", { method: "POST", body: "{}" });
      sessionStorage.setItem("customerTelegramLink", "1");
      window.location.assign(result.authorizationUrl);
    } catch (reason) { setError((reason as Error).message); }
  }

  async function unlinkTelegram() {
    try {
      await api("telegram", { method: "DELETE" });
      setProfile(profile ? { ...profile, telegramLinked: false, notificationsEnabled: false } : null);
      setNotice("Telegram отвязан.");
    } catch (reason) { setError((reason as Error).message); }
  }

  async function addAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const address = await api<CustomerAddressData>("addresses", { method: "POST", body: JSON.stringify({
        city: form.get("city"), street: form.get("street"), building: form.get("building"),
        apartment: form.get("apartment"), postalCode: form.get("postalCode"), note: form.get("note"),
      }) });
      setAddresses([address, ...addresses]);
      event.currentTarget.reset();
      setAddressFormOpen(false);
      setNotice("Адрес добавлен.");
      setError("");
    } catch (reason) { setError((reason as Error).message); }
  }

  async function deleteAddress(id: string) {
    try {
      await api(`addresses/${id}`, { method: "DELETE" });
      setAddresses(addresses.filter((address) => address.id !== id));
      setNotice("Адрес удалён.");
    } catch (reason) { setError((reason as Error).message); }
  }

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    try {
      if (!emailCodeSent) {
        await api("email/change/send-code", { method: "POST", body: JSON.stringify({ email }) });
        setEmailCodeSent(true);
        setNotice("Код подтверждения отправлен на новый email.");
      } else {
        await api("email/change/verify-code", { method: "POST", body: JSON.stringify({ email, code: form.get("code") }) });
        setEmailCodeSent(false);
        setProfile(profile ? { ...profile, email, emailVerified: true } : null);
        setNotice("Email изменён.");
      }
      setError("");
    } catch (reason) { setError((reason as Error).message); }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/auth/change-password", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || payload.title || "Не удалось изменить пароль");
      }
      await logout();
    } catch (reason) { setError((reason as Error).message); }
  }

  if (!user) return <main className="mx-auto flex-1 px-4 py-12 text-center">Сначала <Link className="underline" href="/login">войдите в кабинет</Link>.</main>;

  const currentEmail = [profile?.email, user.login].find((value) => value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

  return (
    <main className="mx-auto w-full max-w-[820px] flex-1 px-1 py-4 sm:px-4 sm:py-8">
      <h1 className="text-[30px] font-semibold tracking-tight text-[#111] sm:text-[34px]">Настройки</h1>
      {notice ? <p role="status" className="mt-4 text-sm text-emerald-700">{notice}</p> : null}
      {error || accountDataError ? <p role="alert" className="mt-4 text-sm text-destructive">{error || accountDataError}</p> : null}

      {profile ? <div className="mt-8 divide-y divide-[#e7e7e7] sm:mt-10">
        <SettingsSection id="contact" title="Контактные данные">
          <form onSubmit={saveProfile} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {([ ["name", "Имя", profile.name], ["phone", "Телефон", profile.phone], ["telegram", "Telegram для связи", profile.contactTelegram], ["whatsApp", "WhatsApp", profile.whatsApp], ["vk", "VK", profile.vk] ] as const).map(([name, label, value]) => (
                <label key={name} className="block text-sm font-medium text-[#333]">{label}
                  <input name={name} defaultValue={value || ""} className={inputClass} autoComplete={name === "name" ? "name" : name === "phone" ? "tel" : "off"} />
                </label>
              ))}
            </div>
            <button className={`${primaryButtonClass} w-full sm:w-auto`}>Сохранить</button>
          </form>
        </SettingsSection>

        <SettingsSection title="Email">
          <div className="mb-5 text-sm">
            <p className="text-neutral-500">Текущий email</p>
            <p className="mt-1 font-medium text-[#222]">{currentEmail || "Email не привязан"}{currentEmail && profile.emailVerified ? <span className="ml-2 text-xs font-normal text-neutral-500">Подтверждён</span> : null}</p>
          </div>
          <form onSubmit={changeEmail} className="space-y-4">
            <label className="block text-sm font-medium text-[#333]">Новый email
              <input name="email" type="email" required placeholder="Новый email" className={inputClass} />
            </label>
            {emailCodeSent ? <label className="block text-sm font-medium text-[#333]">Код из письма
              <input name="code" required inputMode="numeric" maxLength={6} placeholder="Введите код" className={inputClass} autoComplete="one-time-code" />
            </label> : null}
            <button className={`${secondaryButtonClass} w-full sm:w-auto`}>{emailCodeSent ? "Подтвердить новый email" : "Отправить код"}</button>
          </form>
        </SettingsSection>

        <SettingsSection title="Пароль">
          <form onSubmit={changePassword} className="space-y-4">
            <label className="block text-sm font-medium text-[#333]">Текущий пароль
              <input name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-[#333]">Новый пароль
              <input name="newPassword" type="password" minLength={8} required autoComplete="new-password" placeholder="Новый пароль (от 8 символов)" className={inputClass} />
            </label>
            <button className={`${primaryButtonClass} w-full sm:w-auto`}>Изменить пароль</button>
          </form>
        </SettingsSection>

        <SettingsSection title="Telegram и уведомления">
          <p className="text-sm text-neutral-500">Уведомление о создании заявки придёт в привязанный Telegram.</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#ededed] pb-5">
            <div><p className="text-sm font-medium text-[#222]">Telegram</p><p className="mt-1 text-sm text-neutral-500">{profile.telegramLinked ? "Аккаунт подключён" : "Аккаунт не подключён"}</p></div>
            {profile.telegramLinked
              ? <button type="button" onClick={() => void unlinkTelegram()} className="rounded-md px-2 py-2 text-sm text-neutral-600 underline underline-offset-4 hover:text-red-700">Отвязать</button>
              : <button type="button" onClick={() => void linkTelegram()} className={secondaryButtonClass}>Привязать Telegram</button>}
          </div>
          {profile.telegramLinked ? <div className="flex items-center justify-between gap-4 pt-5">
            <div><p className="text-sm font-medium text-[#222]">Получать уведомления</p>{profile.notificationsDisabledByAdmin ? <p className="mt-1 text-xs text-neutral-500">Временно отключены поддержкой</p> : null}</div>
            <button
              type="button"
              role="switch"
              aria-checked={profile.notificationsEnabled}
              aria-label="Получать уведомления в Telegram"
              disabled={profile.notificationsDisabledByAdmin}
              onClick={() => void toggleNotifications()}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-45 ${profile.notificationsEnabled ? "bg-black" : "bg-[#d4d4d4]"}`}
            ><span className={`size-5 rounded-full bg-white shadow-sm transition-transform ${profile.notificationsEnabled ? "translate-x-[22px]" : "translate-x-0.5"}`} /></button>
          </div> : null}
        </SettingsSection>

        <SettingsSection id="addresses" title="Адреса">
          {addresses.length ? <ul className="divide-y divide-[#ededed]">
            {addresses.map((address) => <li key={address.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-[#222]">Адрес</p>
                <p className="mt-1 text-neutral-600">{[address.city, address.street, address.building, address.apartment ? `кв. ${address.apartment}` : null].filter(Boolean).join(", ")}</p>
                {address.postalCode || address.note ? <p className="mt-1 text-xs text-neutral-500">{[address.postalCode, address.note].filter(Boolean).join(" · ")}</p> : null}
              </div>
              <button type="button" onClick={() => void deleteAddress(address.id)} className="px-1 py-1 text-sm text-neutral-500 underline underline-offset-4 hover:text-red-700">Удалить</button>
            </li>)}
          </ul> : <p className="text-sm text-neutral-500">Сохранённых адресов пока нет.</p>}

          {!addressFormOpen ? <button type="button" onClick={() => setAddressFormOpen(true)} className="mt-5 inline-flex items-center gap-2 py-2 text-sm font-medium text-[#222] hover:underline"><Plus className="size-4" aria-hidden="true" />Добавить адрес</button> : (
            <form onSubmit={addAddress} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {([ ["city", "Город"], ["street", "Улица"], ["building", "Дом"], ["apartment", "Квартира"], ["postalCode", "Индекс"], ["note", "Комментарий"] ] as const).map(([name, label]) => (
                  <label key={name} className="block text-sm font-medium text-[#333]">{label}<input name={name} className={inputClass} /></label>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className={`${primaryButtonClass} w-full sm:w-auto`}>Сохранить адрес</button>
                <button type="button" onClick={() => setAddressFormOpen(false)} className={`${secondaryButtonClass} w-full sm:w-auto`}>Отмена</button>
              </div>
            </form>
          )}
        </SettingsSection>
      </div> : <p className="mt-8 text-sm text-neutral-500">{accountDataLoading ? "Загрузка настроек…" : "Настройки профиля пока недоступны."}</p>}
    </main>
  );
}
