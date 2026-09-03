"use client";

import { useState, type ReactElement } from "react";
import { CheckCircle2Icon, ImageIcon, Loader2Icon } from "lucide-react";
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
import { cn } from "@/lib/utils";

export type CheckoutItem = {
  productId: string;
  name: string;
  quantity: number;
  priceRub: number;
  imageUrl?: string;
  tint?: string;
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

type ContactMethod = "phone" | "whatsApp" | "telegram" | "vk";

const contactMethods: Array<{ value: ContactMethod; label: string }> = [
  { value: "phone", label: "Телефон" },
  { value: "whatsApp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "vk", label: "VK" },
];

const contactFields: Record<
  ContactMethod,
  { label: string; placeholder: string; autoComplete?: string; inputMode?: "tel" | "url" }
> = {
  phone: {
    label: "Телефон",
    placeholder: "+7 (___) ___-__-__",
    autoComplete: "tel",
    inputMode: "tel",
  },
  whatsApp: {
    label: "WhatsApp",
    placeholder: "Номер телефона",
    autoComplete: "tel",
    inputMode: "tel",
  },
  telegram: {
    label: "Telegram",
    placeholder: "@username или ссылка на профиль",
  },
  vk: {
    label: "VK",
    placeholder: "Ссылка на профиль",
    inputMode: "url",
  },
};

export function CheckoutSheet({ items, trigger, onSuccess }: CheckoutSheetProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [contactMethod, setContactMethod] = useState<ContactMethod>("phone");
  const [contacts, setContacts] = useState<Record<ContactMethod, string>>({
    phone: "",
    whatsApp: "",
    telegram: "",
    vk: "",
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setError("");
      setResult(null);
    }

    setOpen(nextOpen);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || items.length === 0) {
      return;
    }

    if (!Object.values(contacts).some((value) => value.trim())) {
      setError("Укажите хотя бы один контакт.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name") || null,
          phone: contacts.phone || null,
          telegram: contacts.telegram || null,
          whatsApp: contacts.whatsApp || null,
          vk: contacts.vk || null,
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
  const activeContact = contactFields[contactMethod];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={trigger} />
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden bg-white sm:max-w-[560px]"
      >
        <SheetHeader className="gap-1 px-5 pb-5 pt-6 sm:px-7">
          <SheetTitle className="pr-10 text-2xl font-semibold tracking-tight">
            Оформление заявки
          </SheetTitle>
          <SheetDescription className="text-sm">
            Оплата сейчас не требуется
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
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit} noValidate>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-8 sm:px-7">
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex min-h-20 items-center gap-3 rounded-xl border border-border/80 bg-white p-3"
                  >
                    <CheckoutProductImage item={item} />
                    <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug">
                      {item.name}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </p>
                    <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">
                      {formatCartMoney(item.priceRub * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <Field
                label="Имя"
                name="name"
                placeholder="Ваше имя"
                autoComplete="name"
              />

              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Способ связи</legend>
                <div
                  role="radiogroup"
                  aria-label="Способ связи"
                  className="grid grid-cols-2 overflow-hidden rounded-lg border border-input min-[430px]:grid-cols-4"
                >
                  {contactMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      role="radio"
                      aria-checked={contactMethod === method.value}
                      onClick={() => setContactMethod(method.value)}
                      className={cn(
                        "h-11 border-input px-2 text-sm transition-colors outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50",
                        "border-b odd:border-r min-[430px]:border-b-0 min-[430px]:border-r min-[430px]:last:border-r-0",
                        contactMethod === method.value
                          ? "bg-muted font-medium text-foreground"
                          : "bg-white text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <Field
                key={contactMethod}
                label={activeContact.label}
                name={contactMethod}
                value={contacts[contactMethod]}
                placeholder={activeContact.placeholder}
                autoComplete={activeContact.autoComplete}
                inputMode={activeContact.inputMode}
                onChange={(event) => {
                  setContacts((current) => ({
                    ...current,
                    [contactMethod]: event.target.value,
                  }));
                  if (error === "Укажите хотя бы один контакт.") {
                    setError("");
                  }
                }}
              />

              <Field
                label="Адрес доставки"
                name="address"
                placeholder="Город, улица, дом, квартира"
                autoComplete="street-address"
              />

              <p className="text-xs text-muted-foreground">
                Укажите хотя бы один контакт.
              </p>

              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>

            <SheetFooter className="shrink-0 gap-4 border-t border-border bg-white px-5 pb-5 pt-4 sm:px-7 sm:pb-6">
              <div className="flex items-center justify-between text-base">
                <span className="font-medium">Итого</span>
                <span className="font-semibold tabular-nums">{formatCartMoney(total)}</span>
              </div>
              <Button
                type="submit"
                className="h-12 w-full bg-black text-white hover:bg-black/85"
                disabled={submitting || items.length === 0}
              >
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

function CheckoutProductImage({ item }: { item: CheckoutItem }) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(item.imageUrl) && !failed;

  return (
    <div
      className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"
      style={{
        background: hasImage
          ? undefined
          : `linear-gradient(145deg, ${item.tint || "#e5e7eb"}, #f3f4f6 85%)`,
      }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageIcon className="size-5 text-muted-foreground/60" aria-hidden="true" />
      )}
    </div>
  );
}

function Field({
  label,
  name,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <Input name={name} className={cn("h-12 px-4", className)} {...props} />
    </label>
  );
}
