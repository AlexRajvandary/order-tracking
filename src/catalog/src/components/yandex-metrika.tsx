"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const COUNTER_ID = 112574449;

declare global {
  interface Window {
    dataLayer: unknown[];
    ym?: (...args: unknown[]) => void;
    __theGetMetrikaInitialized?: boolean;
    __theGetMetrikaLastUrl?: string;
  }
}

function currentUrl() {
  return window.location.href;
}

export function YandexMetrika() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    if (!window.__theGetMetrikaInitialized || !window.ym) return;

    const url = currentUrl();
    if (window.__theGetMetrikaLastUrl === url) return;

    window.ym(COUNTER_ID, "hit", url, {
      referrer: window.__theGetMetrikaLastUrl,
      title: document.title,
    });
    window.__theGetMetrikaLastUrl = url;
  }, [pathname, query]);

  return null;
}
