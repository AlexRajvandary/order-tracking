import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Get — каталог",
    template: "%s · The Get",
  },
  description: "Демо-каталог товаров The Get. Пока данные в памяти приложения.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className="flex min-h-full flex-col bg-background font-sans antialiased">
        <CartProvider>
          <FavoritesProvider>
            <div className="flex min-h-full flex-1 flex-col">{children}</div>
            <Footer />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
