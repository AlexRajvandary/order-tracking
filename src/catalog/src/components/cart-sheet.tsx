"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { MinusIcon, PlusIcon, ShoppingBagIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCartMoney, useCart } from "@/components/cart-provider";
import { CheckoutSheet } from "@/components/checkout-sheet";

type CartSheetProps = {
  trigger?: ReactElement;
};

export function CartSheet({ trigger }: CartSheetProps) {
  const { items, itemCount, totalRub, setQuantity, removeItem, clear } = useCart();

  return (
    <Sheet>
      {trigger ? (
        <SheetTrigger render={trigger} />
      ) : (
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label="Корзина"
            />
          }
        >
          <ShoppingBagIcon className="size-4" />
          {itemCount > 0 && (
            <Badge className="absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full px-1">
              {itemCount}
            </Badge>
          )}
        </SheetTrigger>
      )}
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl">Корзина</SheetTitle>
          <SheetDescription>
            {itemCount === 0
              ? "Пока пусто — добавьте товары из каталога."
              : `${itemCount} поз. · демо без оплаты`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-8 text-center">
            <ShoppingBagIcon className="size-10 text-muted-foreground" />
            <Button render={<Link href="/" />}>К каталогу</Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4">
              <ul className="space-y-4 pb-4">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-3">
                    <div
                      className="size-16 shrink-0 overflow-hidden bg-muted"
                      style={{
                        background: item.imageUrl
                          ? undefined
                          : `linear-gradient(145deg, ${item.tint || "#334155"}, #0b1220 85%)`,
                      }}
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${item.productId}`}
                          className="text-sm font-semibold leading-snug hover:underline"
                        >
                          {item.name}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Удалить"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCartMoney(item.priceRub)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          aria-label="Меньше"
                          onClick={() =>
                            setQuantity(item.productId, item.quantity - 1)
                          }
                        >
                          <MinusIcon />
                        </Button>
                        <span className="w-6 text-center text-sm tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          aria-label="Больше"
                          onClick={() =>
                            setQuantity(item.productId, item.quantity + 1)
                          }
                        >
                          <PlusIcon />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>

            <Separator />
            <SheetFooter className="gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Итого</span>
                <span className="text-lg font-bold">
                  {formatCartMoney(totalRub)}
                </span>
              </div>
              <Button variant="outline" className="w-full" onClick={clear}>
                Очистить корзину
              </Button>
              <CheckoutSheet
                items={items}
                onSuccess={clear}
                trigger={<Button className="w-full">Перейти к оформлению</Button>}
              />
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
