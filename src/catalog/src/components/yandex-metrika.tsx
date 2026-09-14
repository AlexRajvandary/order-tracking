"use client";

import Script from "next/script";
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

  function initialize() {
    window.dataLayer = window.dataLayer || [];
    if (!window.ym || window.__theGetMetrikaInitialized) return;

    window.ym(COUNTER_ID, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: currentUrl(),
      accurateTrackBounce: true,
      trackLinks: true,
    });
    window.__theGetMetrikaInitialized = true;
    window.__theGetMetrikaLastUrl = currentUrl();
  }

  return (
    <>
      <Script
        id="yandex-metrika"
        src={`https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}`}
        strategy="afterInteractive"
        onLoad={initialize}
        onReady={initialize}
      />
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${COUNTER_ID}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
