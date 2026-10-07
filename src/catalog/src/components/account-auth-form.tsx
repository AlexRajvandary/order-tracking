"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCustomerAccount } from "@/components/customer-account-provider";

type Tokens = { accessToken: string; user: { id: string; login: string; displayName?: string; role: string } };

export function AccountAuthForm({ mode }: { mode: "login" | "register" }) {
  const { accept } = useCustomerAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`/api/v1/${path}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({})) as T & { message?: string; detail?: string; title?: string };
    if (!response.ok) throw new Error(payload.message || payload.detail || payload.title || "Не удалось выполнить запрос");
    return payload;
  }

  async function telegram() {
    setBusy(true); setError("");
    try {
      const result = await post<{ authorizationUrl: string }>("customer-account/telegram/login/start", {});
      const claimToken = new URLSearchParams(window.location.search).get("claimToken");
      if (claimToken) sessionStorage.setItem("customerClaimToken", claimToken);
      window.location.assign(result.authorizationUrl);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось начать вход через Telegram"); setBusy(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const claimToken = new URLSearchParams(window.location.search).get("claimToken");
      if (mode === "login") {
        const tokens = await post<Tokens>("customer-account/email/login", { email, password });
        accept(tokens);
        if (claimToken) {
          const response = await fetch("/api/v1/customer-account/email/claim", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.accessToken}` }, body: JSON.stringify({ token: claimToken }) });
          if (!response.ok) throw new Error("Не удалось привязать заявку. Войдите в кабинет и проверьте её позже.");
        }
        window.location.assign("/account");
      } else if (!sent) {
        await post("customer-account/email/register/send-code", { email, password, name });
        setSent(true);
      } else {
        const tokens = await post<Tokens>("customer-account/email/register/verify-code", { email, code, claimToken });
        accept(tokens); window.location.assign("/account");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось выполнить запрос"); }
    finally { setBusy(false); }
  }

  const fieldClass = "mt-2 h-13 w-full rounded-xl border border-[#dededb] bg-white px-4 text-[15px] outline-none transition focus:border-neutral-800 focus:ring-2 focus:ring-neutral-900/10";

  return <section className="mx-auto grid min-h-[min(680px,calc(100svh-48px))] w-full max-w-[1240px] overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_20px_70px_rgba(0,0,0,0.08)] lg:grid-cols-2">
    <div className="flex items-center justify-center px-5 py-7 sm:px-10 sm:py-10 lg:px-12 xl:px-16">
      <div className="w-full max-w-[410px]">
        <Link href="/" aria-label="The Get — на главную" className="mb-8 inline-flex">
          <Image src="/thegetlogo.png" alt="The Get" width={90} height={90} className="h-12 w-12 object-contain" priority />
        </Link>
        <h1 className="text-[30px] font-semibold tracking-tight text-[#171717] sm:text-[36px]">{mode === "login" ? "С возвращением" : "Регистрация"}</h1>
        {mode === "login" ? <p className="mt-2 text-[15px] text-neutral-500">Войдите в свой аккаунт The Get</p> : null}

        <button type="button" disabled={busy} onClick={() => void telegram()} className="mt-5 flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-[#e5e5e5] bg-white font-medium text-[#222] transition hover:border-[#cfcfcf] hover:bg-[#f8f8f7] disabled:cursor-not-allowed disabled:opacity-60">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-[#229ED9]"><path d="M21.7 3.3a1.5 1.5 0 0 0-1.56-.24L2.83 9.92c-1.17.46-1.12 2.13.08 2.51l4.43 1.39 1.39 4.43c.38 1.2 2.05 1.25 2.51.08l6.86-17.31a1.5 1.5 0 0 0-.4-1.72ZM9.8 13.78l7.16-7.16-5.67 14.3-1.49-4.76 4.43-4.43-4.43 2.05Z"/></svg>
          Продолжить через Telegram
        </button>

        <div className="my-5 flex items-center gap-4 text-xs text-neutral-400"><span className="h-px flex-1 bg-[#e8e8e6]"/><span>или по email</span><span className="h-px flex-1 bg-[#e8e8e6]"/></div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && !sent ? <label className="block text-sm font-medium text-[#333]">Имя<input required value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} placeholder="Введите ваше имя" autoComplete="name"/></label> : null}
          <label className="block text-sm font-medium text-[#333]">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} placeholder="example@mail.com" autoComplete="email"/></label>
          {!sent ? <label className="block text-sm font-medium text-[#333]">Пароль{mode === "login" ? <Link className="float-right font-normal text-neutral-500 underline underline-offset-4 hover:text-neutral-900" href="/forgot-password">Забыли пароль?</Link> : null}<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} placeholder={mode === "login" ? "Введите пароль" : "Создайте пароль"} autoComplete={mode === "login" ? "current-password" : "new-password"}/></label> : <label className="block text-sm font-medium text-[#333]">Код из письма<input required inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className={fieldClass} autoComplete="one-time-code"/></label>}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <button disabled={busy} className="h-13 w-full rounded-xl bg-black font-medium text-white transition hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Подождите…" : mode === "login" ? "Войти" : sent ? "Подтвердить email" : "Отправить код"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-500">{mode === "login" ? <>Нет аккаунта? <Link className="font-medium text-[#222] underline underline-offset-4" href="/register">Зарегистрироваться</Link></> : <>Уже есть аккаунт? <Link className="font-medium text-[#222] underline underline-offset-4" href="/login">Войти</Link></>}</p>
      </div>
    </div>
    <div className="relative hidden min-h-full bg-[#ededeb] lg:block">
      <Image src="/the-get-metallic.png" alt="" fill priority sizes="(min-width: 1024px) 50vw, 0px" className="object-cover" />
    </div>
  </section>;
}
