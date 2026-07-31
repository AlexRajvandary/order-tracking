import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
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
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
