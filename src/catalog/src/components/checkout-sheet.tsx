"use client";

import { useEffect, useState, type ReactElement } from "react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatCartMoney } from "@/components/cart-provider";

export type CheckoutItem = {
  productId: string;
  name: string;
  quantity: number;
  priceRub: number;
};

type CheckoutSheetProps = {
  items: CheckoutItem[];
  trigger: ReactElement;
  onSuccess?: () => void;
};

type CheckoutResult = {
  orderId: string;
  trackingCode: string;
};

export function CheckoutSheet({ items, trigger, onSuccess }: CheckoutSheetProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckoutResult | null>(null);

  useEffect(() => {
    if (open) {
      setError("");
      setResult(null);
    }
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || items.length === 0) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name") || null,
          phone: form.get("phone") || null,
          whatsApp: form.get("whatsApp") || null,
          vk: form.get("vk") || null,
          address: form.get("address") || null,
          items: items.map(({ productId, quantity }) => ({ productId, quantity })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { title?: string; detail?: string }
          | null;
        throw new Error(payload?.detail || payload?.title || "Не удалось оформить заявку");
      }

      const created = (await response.json()) as CheckoutResult;
      setResult(created);
      onSuccess?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось оформить заявку");
    } finally {
      setSubmitting(false);
    }
  }

  const total = items.reduce((sum, item) => sum + item.priceRub * item.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-xl">Оформление заявки</SheetTitle>
          <SheetDescription>
            Оставьте удобные контакты. Оплата на этом этапе не требуется.
          </SheetDescription>
        </SheetHeader>

        {result ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <CheckCircle2Icon className="size-12 text-emerald-600" />
            <div>
              <h3 className="text-lg font-semibold">Заявка оформлена</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Номер для отслеживания: <strong>{result.trackingCode}</strong>
              </p>
            </div>
            <Button type="button" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
            <div className="space-y-5 overflow-y-auto px-4 pb-4">
              <div className="space-y-2">
                <h3 className="font-medium">Товары</h3>
                <ul className="space-y-2 text-sm">
                  {items.map((item) => (
                    <li key={item.productId} className="flex justify-between gap-4">
                      <span className="min-w-0 truncate">{item.name} × {item.quantity}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatCartMoney(item.priceRub * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Итого</span>
                  <span>{formatCartMoney(total)}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Имя" name="name" autoComplete="name" />
                <Field label="Телефон" name="phone" autoComplete="tel" inputMode="tel" />
                <Field label="WhatsApp" name="whatsApp" inputMode="tel" />
                <Field label="VK" name="vk" placeholder="Ссылка или профиль" />
              </div>

              <label className="block space-y-1.5 text-sm font-medium">
                <span>Адрес доставки</span>
                <textarea
                  name="address"
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </label>

              <p className="text-xs text-muted-foreground">
                Все поля необязательны. Менеджер свяжется с вами, если указан хотя бы один контакт.
              </p>

              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            </div>

            <SheetFooter>
              <Button type="submit" className="w-full" disabled={submitting || items.length === 0}>
                {submitting ? <Loader2Icon className="animate-spin" /> : null}
                {submitting ? "Оформляем…" : "Оформить заявку"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <Input name={name} {...props} />
    </label>
  );
}
