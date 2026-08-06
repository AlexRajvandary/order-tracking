"use client";

import Link from "next/link";
import { MinusIcon, PlusIcon, ShoppingBagIcon, Trash2Icon } from "lucide-react";
import { formatCartMoney, useCart } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function CartPage() {
  const { items, itemCount, totalRub, setQuantity, removeItem, clear } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Корзина</h1>
          <p className="text-sm text-muted-foreground">
            {itemCount === 0
              ? "Пока пусто. Добавьте товары со страниц каталога."
              : `${itemCount} позиций · сумма считается в памяти браузера`}
          </p>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardHeader className="items-center text-center">
              <ShoppingBagIcon className="mb-2 size-10 text-muted-foreground" />
              <CardTitle className="text-xl">Корзина пуста</CardTitle>
              <CardDescription>Откройте каталог и нажмите «В корзину».</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button render={<Link href="/" />}>К каталогу</Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-4 p-4 sm:p-5">
                    <div
                      className="size-20 shrink-0 rounded-lg sm:size-24"
                      style={{
                        background: `linear-gradient(145deg, ${item.tint}, oklch(0.25 0 0) 85%)`,
                      }}
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/products/${item.productId}`}
                            className="text-base font-semibold hover:underline sm:text-lg"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatCartMoney(item.priceRub)} / шт.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Удалить"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label="Меньше"
                            onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          >
                            <MinusIcon />
                          </Button>
                          <Badge variant="secondary" className="min-w-8 justify-center tabular-nums">
                            {item.quantity}
                          </Badge>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label="Больше"
                            onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          >
                            <PlusIcon />
                          </Button>
                        </div>
                        <p className="font-semibold tabular-nums">
                          {formatCartMoney(item.priceRub * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Итого</CardTitle>
                <CardDescription>Оплата пока не подключена</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Товары</span>
                  <span>{itemCount}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">К оплате</span>
                  <span className="text-2xl font-bold">{formatCartMoney(totalRub)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button className="w-full" disabled>
                  Оформить заказ — скоро
                </Button>
                <Button variant="outline" className="w-full" onClick={clear}>
                  Очистить корзину
                </Button>
                <Button variant="ghost" className="w-full" render={<Link href="/" />}>
                  Продолжить покупки
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
