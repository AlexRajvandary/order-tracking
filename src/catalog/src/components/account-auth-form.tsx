"use client";

import { useState } from "react";
import Link from "next/link";
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

  return <section className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
    <h1 className="text-2xl font-semibold">{mode === "login" ? "Войти в кабинет" : "Создать кабинет"}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{mode === "login" ? "Отслеживайте свои заявки и заказы." : "Подтвердите email одноразовым кодом."}</p>
    <button type="button" disabled={busy} onClick={() => void telegram()} className="mt-6 h-11 w-full rounded-lg bg-[#229ED9] font-medium text-white disabled:opacity-60">Продолжить через Telegram</button>
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>или по email<span className="h-px flex-1 bg-border"/></div>
    <form onSubmit={submit} className="space-y-4">
      {mode === "register" && !sent ? <label className="block text-sm">Имя<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" autoComplete="name"/></label> : null}
      <label className="block text-sm">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" autoComplete="email"/></label>
      {!sent ? <label className="block text-sm">Пароль<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" autoComplete={mode === "login" ? "current-password" : "new-password"}/></label> : <label className="block text-sm">Код из письма<input required inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" autoComplete="one-time-code"/></label>}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <button disabled={busy} className="h-11 w-full rounded-lg bg-black font-medium text-white disabled:opacity-60">{busy ? "Подождите…" : mode === "login" ? "Войти" : sent ? "Подтвердить email" : "Отправить код"}</button>
    </form>
    <p className="mt-5 text-sm text-muted-foreground">{mode === "login" ? <><Link className="text-foreground underline" href="/forgot-password">Забыли пароль?</Link><br/>Нет аккаунта? <Link className="text-foreground underline" href="/register">Зарегистрироваться</Link></> : <>Уже есть аккаунт? <Link className="text-foreground underline" href="/login">Войти</Link></>}</p>
  </section>;
}
