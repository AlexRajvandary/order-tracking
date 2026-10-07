"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AccountUser = { id: string; login: string; displayName?: string | null; role: string };
type AuthTokens = { accessToken: string; user: AccountUser };
type AccountContextValue = { user: AccountUser | null; ready: boolean; token: string | null; accept: (tokens: AuthTokens) => void; logout: () => Promise<void> };
const AccountContext = createContext<AccountContextValue | null>(null);
const ACCOUNT_USER_STORAGE_KEY = "customer-account-user";

export function CustomerAccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const accept = useCallback((tokens: AuthTokens) => {
    setToken(tokens.accessToken);
    setUser(tokens.user);
    try { window.localStorage.setItem(ACCOUNT_USER_STORAGE_KEY, JSON.stringify(tokens.user)); } catch { /* Storage can be unavailable in private browsing. */ }
  }, []);
  useEffect(() => {
    try {
      const cachedUser = window.localStorage.getItem(ACCOUNT_USER_STORAGE_KEY);
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser) as AccountUser;
        if (parsed.role === "Buyer" && parsed.id) setUser(parsed);
      }
    } catch {
      try { window.localStorage.removeItem(ACCOUNT_USER_STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
    }
    void fetch("/api/v1/auth/refresh", { method: "POST", credentials: "same-origin" })
      .then(async (response) => {
        if (response.ok) accept(await response.json() as AuthTokens);
        else {
          setUser(null);
          window.localStorage.removeItem(ACCOUNT_USER_STORAGE_KEY);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [accept]);
  const logout = useCallback(async () => {
    const shouldReturnToHome = window.location.pathname === "/account" || window.location.pathname.startsWith("/account/");
    try { await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" }); } finally {
      setUser(null);
      setToken(null);
      window.localStorage.removeItem(ACCOUNT_USER_STORAGE_KEY);
      if (shouldReturnToHome) window.location.assign("/");
    }
  }, []);
  const value = useMemo(() => ({ user, ready, token, accept, logout }), [user, ready, token, accept, logout]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useCustomerAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("CustomerAccountProvider is missing");
  return value;
}
