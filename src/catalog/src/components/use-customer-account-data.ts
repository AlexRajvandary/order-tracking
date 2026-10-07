"use client";

import { useEffect, useState } from "react";

export type CustomerProfileData = {
  email?: string;
  emailVerified: boolean;
  name?: string;
  phone?: string;
  contactTelegram?: string;
  whatsApp?: string;
  vk?: string;
  telegramLinked: boolean;
  notificationsEnabled: boolean;
  notificationsDisabledByAdmin: boolean;
};

export type CustomerAddressData = {
  id: string;
  city?: string;
  street?: string;
  building?: string;
  apartment?: string;
  postalCode?: string;
  note?: string;
};

export function useCustomerAccountData(token: string | null) {
  const [result, setResult] = useState<{
    token: string;
    profile: CustomerProfileData | null;
    addresses: CustomerAddressData[];
    error: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    void Promise.all([
      fetch("/api/v1/customer-account/profile", { headers }).then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить профиль");
        return await response.json() as CustomerProfileData;
      }),
      fetch("/api/v1/customer-account/addresses", { headers }).then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить адреса");
        return await response.json() as CustomerAddressData[];
      }),
    ]).then(([nextProfile, nextAddresses]) => {
      if (cancelled) return;
      setResult({ token, profile: nextProfile, addresses: nextAddresses, error: "" });
    }).catch((reason: Error) => {
      if (!cancelled) setResult({ token, profile: null, addresses: [], error: reason.message });
    });

    return () => { cancelled = true; };
  }, [token]);

  const isCurrentResult = Boolean(token && result?.token === token);
  const profile = isCurrentResult ? result?.profile ?? null : null;
  const addresses = isCurrentResult ? result?.addresses ?? [] : [];
  const loading = Boolean(token) && !isCurrentResult;
  const error = isCurrentResult ? result?.error ?? "" : "";

  function setProfile(nextProfile: CustomerProfileData | null) {
    if (token && result?.token === token) setResult({ ...result, profile: nextProfile });
  }
  function setAddresses(nextAddresses: CustomerAddressData[]) {
    if (token && result?.token === token) setResult({ ...result, addresses: nextAddresses });
  }

  return { profile, setProfile, addresses, setAddresses, loading, error };
}
