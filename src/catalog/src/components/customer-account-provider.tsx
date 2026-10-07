"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AccountUser = { id: string; login: string; displayName?: string | null; role: string };
type AuthTokens = { accessToken: string; user: AccountUser };
type AccountContextValue = { user: AccountUser | null; ready: boolean; token: string | null; accept: (tokens: AuthTokens) => void; logout: () => Promise<void> };
const AccountContext = createContext<AccountContextValue | null>(null);

export function CustomerAccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const accept = useCallback((tokens: AuthTokens) => { setToken(tokens.accessToken); setUser(tokens.user); }, []);
  useEffect(() => {
    void fetch("/api/v1/auth/refresh", { method: "POST", credentials: "same-origin" })
      .then(async (response) => { if (response.ok) accept(await response.json() as AuthTokens); })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [accept]);
  const logout = useCallback(async () => {
    try { await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" }); } finally { setUser(null); setToken(null); }
  }, []);
  const value = useMemo(() => ({ user, ready, token, accept, logout }), [user, ready, token, accept, logout]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useCustomerAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("CustomerAccountProvider is missing");
  return value;
}
