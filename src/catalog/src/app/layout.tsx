import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { CartProvider } from "@/components/cart-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { Footer } from "@/components/footer";
import { OrderProcess } from "@/components/order-process";
import { YandexMetrika } from "@/components/yandex-metrika";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://the-get.ru"),
  title: {
    default: "The Get — товары из Японии",
    template: "%s · The Get",
  },
  description:
    "Находите и заказывайте товары из японских магазинов и маркетплейсов. The Get поможет с выкупом, проверкой и доставкой товаров из Японии.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "The Get",
    title: "The Get — товары из Японии",
    description:
      "Находите и заказывайте товары из японских магазинов и маркетплейсов. The Get поможет с выкупом, проверкой и доставкой товаров из Японии.",
  },
  twitter: {
    card: "summary",
    title: "The Get — товары из Японии",
    description:
      "Находите и заказывайте товары из японских магазинов и маркетплейсов. The Get поможет с выкупом, проверкой и доставкой товаров из Японии.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <head>
        <Script id="yandex-metrika" strategy="beforeInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m.dataLayer=m.dataLayer||[];
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
            })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=112574449','ym');

            if(!window.__theGetMetrikaInitialized){
              ym(112574449,'init',{ssr:true,defer:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',accurateTrackBounce:true,trackLinks:true});
              ym(112574449,'hit',location.href,{referer:document.referrer,title:document.title});
              window.__theGetMetrikaInitialized=true;
              window.__theGetMetrikaLastUrl=location.href;
            }
          `}
        </Script>
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans antialiased">
        <Suspense fallback={null}>
          <YandexMetrika />
        </Suspense>
        <noscript>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://mc.yandex.ru/watch/112574449"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        <CartProvider>
          <FavoritesProvider>
            <main className="flex min-h-full flex-1 flex-col bg-background">{children}</main>
            <OrderProcess />
            <Footer />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
