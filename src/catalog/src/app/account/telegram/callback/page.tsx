"use client";
import { useEffect, useState } from "react";
import { useCustomerAccount } from "@/components/customer-account-provider";

export default function TelegramCallbackPage() {
  const { accept } = useCustomerAccount();
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code"); const state = params.get("state");
    if (!code || !state) { setError("Telegram не вернул код авторизации."); return; }
    const claimToken = sessionStorage.getItem("customerClaimToken");
    sessionStorage.removeItem("customerClaimToken");
    const linking = sessionStorage.getItem("customerTelegramLink") === "1";
    sessionStorage.removeItem("customerTelegramLink");
    void (async () => {
      let accessToken: string | undefined;
      if (linking) {
        const refreshed = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "same-origin" });
        if (!refreshed.ok) throw new Error("Сессия кабинета истекла. Войдите и повторите привязку.");
        accessToken = (await refreshed.json()).accessToken as string;
      }
      const res = await fetch("/api/v1/customer-account/telegram/complete", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ code, state, claimToken }) });
      const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.message || data.title || "Не удалось войти через Telegram");
      if (!linking) accept(data); window.location.replace(linking ? "/account/settings" : "/account");
    })()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка входа"));
  }, [accept]);
  return <main className="mx-auto flex min-h-80 max-w-xl flex-1 flex-col items-center justify-center px-5 text-center"><h1 className="text-xl font-semibold">Завершаем вход через Telegram</h1><p className="mt-2 text-sm text-muted-foreground">{error || "Это займёт несколько секунд…"}</p>{error ? <a className="mt-5 underline" href="/login">Вернуться ко входу</a> : null}</main>;
}
