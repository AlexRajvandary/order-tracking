"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ContactType = "telegram" | "phone" | "whatsapp" | "vk";

type RequestResult = {
  orderId: string;
  trackingCode: string;
};

const contactOptions: Array<{
  value: ContactType;
  label: string;
  placeholder: string;
  inputMode?: "tel" | "url";
}> = [
  { value: "telegram", label: "Telegram", placeholder: "@username" },
  {
    value: "phone",
    label: "Phone",
    placeholder: "+44...",
    inputMode: "tel",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    placeholder: "+44...",
    inputMode: "tel",
  },
  {
    value: "vk",
    label: "VK",
    placeholder: "https://vk.com/...",
    inputMode: "url",
  },
];

export function IndividualRequestForm() {
  const [contactType, setContactType] = useState<ContactType>("telegram");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RequestResult | null>(null);

  const activeContact =
    contactOptions.find((option) => option.value === contactType) ??
    contactOptions[0];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const contact = String(form.get("contact") ?? "").trim();
    const customerName = String(form.get("customerName") ?? "").trim();
    const productUrl = String(form.get("productUrl") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    if (!contact || !customerName || !description) {
      setError("Заполните обязательные поля.");
      return;
    }

    if (productUrl) {
      try {
        const url = new URL(productUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error();
        }
      } catch {
        setError("Укажите корректную ссылку на товар.");
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/individual-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactType,
          contact,
          customerName,
          productUrl: productUrl || null,
          description,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { title?: string; detail?: string }
          | null;
        throw new Error(
          payload?.detail || payload?.title || "Не удалось отправить запрос",
        );
      }

      setResult((await response.json()) as RequestResult);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось отправить запрос",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div
        className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-border bg-white px-6 py-12 text-center shadow-sm"
        role="status"
      >
        <CheckCircle2 className="size-12 text-emerald-600" aria-hidden />
        <h2 className="mt-5 text-xl font-semibold">Запрос отправлен</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Мы свяжемся с вами, когда обработаем его. Номер заявки: {" "}
          <strong className="text-foreground">{result.trackingCode}</strong>
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() => setResult(null)}
        >
          Отправить ещё один запрос
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8"
      noValidate
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Куда прислать ответ?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
          {contactOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={contactType === option.value}
              onClick={() => {
                setContactType(option.value);
                setError("");
              }}
              className={cn(
                "h-11 rounded-lg border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                contactType === option.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-input bg-background hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <FormField label={activeContact.label} required>
        <Input
          key={contactType}
          name="contact"
          required
          maxLength={contactType === "phone" ? 30 : 200}
          placeholder={activeContact.placeholder}
          inputMode={activeContact.inputMode}
          autoComplete={contactType === "phone" ? "tel" : undefined}
          className="h-11 px-3"
          onChange={() => setError("")}
        />
      </FormField>

      <FormField label="Как вас зовут" required>
        <Input
          name="customerName"
          required
          maxLength={100}
          placeholder="Ваше имя"
          autoComplete="name"
          className="h-11 px-3"
          onChange={() => setError("")}
        />
      </FormField>

      <FormField
        label="Ссылка на товар"
        hint="Ссылка на товар, если удалось найти"
      >
        <Input
          name="productUrl"
          type="url"
          maxLength={2000}
          placeholder="https://..."
          inputMode="url"
          className="h-11 px-3"
          onChange={() => setError("")}
        />
      </FormField>

      <FormField label="Описание запроса" required>
        <Textarea
          name="description"
          required
          maxLength={4000}
          placeholder="Например: Ищу редкую фигурку, карточку или одежду определённой модели. Можно б/у в хорошем состоянии..."
          className="min-h-36"
          onChange={() => setError("")}
        />
      </FormField>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 w-full bg-black text-white hover:bg-black/85"
      >
        {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {submitting ? "Отправляем…" : "Отправить запрос"}
      </Button>

      <p className="text-xs leading-5 text-muted-foreground">
        Нажимая на кнопку, вы даёте согласие на обработку предоставленных данных
        в соответствии с политикой конфиденциальности.
      </p>
    </form>
  );
}

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
