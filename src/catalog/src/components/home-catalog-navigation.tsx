"use client";

import { useLayoutEffect, type MouseEvent, type ReactNode } from "react";

const SCROLL_TO_TOP_KEY = "catalog:scroll-to-top-on-entry";

export function HomeCatalogNavigation({ children }: { children: ReactNode }) {
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target as Element;
    const link = target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/categories/")) return;

    sessionStorage.setItem(SCROLL_TO_TOP_KEY, "true");
  }

  return <div onClickCapture={handleClick}>{children}</div>;
}

export function CatalogEntryScrollReset() {
  useLayoutEffect(() => {
    if (sessionStorage.getItem(SCROLL_TO_TOP_KEY) !== "true") return;
    sessionStorage.removeItem(SCROLL_TO_TOP_KEY);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return null;
}
