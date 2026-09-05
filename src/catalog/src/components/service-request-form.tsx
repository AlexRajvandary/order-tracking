"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ServiceRequestType = "individual" | "auction" | "ticket";
type ContactType = "telegram" | "phone" | "whatsapp" | "vk";

type RequestResult = {
  orderId: string;
  trackingCode: string;
};

const maxImages = 5;
const maxImageBytes = 10 * 1024 * 1024;

const formConfig: Record<
  ServiceRequestType,
  { endpoint: string; submitLabel: string; pendingLabel: string }
> = {
  individual: {
    endpoint: "/api/individual-requests",
    submitLabel: "Отправить запрос",
    pendingLabel: "Отправляем…",
  },
  auction: {
    endpoint: "/api/auction-requests",
    submitLabel: "Отправить заявку",
    pendingLabel: "Отправляем…",
  },
  ticket: {
    endpoint: "/api/ticket-requests",
    submitLabel: "Отправить заявку",
    pendingLabel: "Отправляем…",
  },
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
    label: "Телефон",
    placeholder: "+7...",
    inputMode: "tel",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    placeholder: "+7...",
    inputMode: "tel",
  },
  {
    value: "vk",
    label: "VK",
    placeholder: "https://vk.com/...",
    inputMode: "url",
  },
];

export function ServiceRequestForm({ type }: { type: ServiceRequestType }) {
  const config = formConfig[type];
  const [contactType, setContactType] = useState<ContactType>("telegram");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RequestResult | null>(null);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl),
      );
    };
  }, []);

  const activeContact =
    contactOptions.find((option) => option.value === contactType) ??
    contactOptions[0];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const payload = buildPayload(type, contactType, form);
    const validationError = validatePayload(type, payload);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const requestBody = buildRequestBody(payload, images);
      const response = await fetch(config.endpoint, {
        method: "POST",
        body: requestBody,
      });

      if (!response.ok) {
        const responsePayload = (await response.json().catch(() => null)) as
          | { title?: string; detail?: string }
          | null;
        throw new Error(
          responsePayload?.detail ||
            responsePayload?.title ||
            "Не удалось отправить заявку",
        );
      }

      setResult((await response.json()) as RequestResult);
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setImages([]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось отправить заявку",
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
        <h2 className="mt-5 text-xl font-semibold">Заявка отправлена</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Мы свяжемся с вами после обработки. Номер заявки: {" "}
          <strong className="text-foreground">{result.trackingCode}</strong>
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() => setResult(null)}
        >
          Отправить ещё одну заявку
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
      <ContactSelector
        value={contactType}
        onChange={(value) => {
          setContactType(value);
          setError("");
        }}
      />

      <FormField label={activeContact.label} required>
        <Input
          key={contactType}
          name="contact"
          required
          maxLength={
            contactType === "phone"
              ? 30
              : contactType === "vk"
                ? 200
                : 100
          }
          placeholder={activeContact.placeholder}
          inputMode={activeContact.inputMode}
          autoComplete={contactType === "phone" ? "tel" : undefined}
          className="h-11 px-3"
          onChange={() => setError("")}
        />
      </FormField>

      <FormField label="Как вас зовут" required={type === "individual"}>
        <Input
          name="customerName"
          required={type === "individual"}
          maxLength={100}
          placeholder="Ваше имя"
          autoComplete="name"
          className="h-11 px-3"
          onChange={() => setError("")}
        />
      </FormField>

      <RequestSpecificFields type={type} clearError={() => setError("")} />

      <ImageAttachments
        images={images}
        onChange={setImages}
        onError={setError}
      />

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
        {submitting ? config.pendingLabel : config.submitLabel}
      </Button>

      <p className="text-xs leading-5 text-muted-foreground">
        Нажимая на кнопку, вы даёте согласие на обработку предоставленных данных
        в соответствии с политикой конфиденциальности.
      </p>
    </form>
  );
}

type SelectedImage = {
  file: File;
  previewUrl: string;
  id: string;
};

function ImageAttachments({
  images,
  onChange,
  onError,
}: {
  images: SelectedImage[];
  onChange: (images: SelectedImage[]) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFiles(files: FileList | null) {
    if (!files) return;

    const nextFiles = Array.from(files);
    if (images.length + nextFiles.length > maxImages) {
      onError(`Можно прикрепить не более ${maxImages} изображений.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const invalidFile = nextFiles.find(
      (file) => !file.type.startsWith("image/") || file.size > maxImageBytes,
    );
    if (invalidFile) {
      onError("Выберите изображения размером не более 10 МБ каждое.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    onError("");
    onChange([
      ...images,
      ...nextFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        id: crypto.randomUUID(),
      })),
    ]);

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(id: string) {
    const image = images.find((item) => item.id === id);
    if (image) URL.revokeObjectURL(image.previewUrl);
    onChange(images.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Изображения</p>
          <p className="mt-1 text-xs text-muted-foreground">
            До {maxImages} файлов, не более 10 МБ каждый
          </p>
        </div>
        <Input
          ref={inputRef}
          type="file"
          name="image-picker"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => selectFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={images.length >= maxImages}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden />
          Прикрепить
        </Button>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              <Image
                src={image.previewUrl}
                alt={image.file.name}
                fill
                unoptimized
                className="object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label={`Удалить ${image.file.name}`}
                className="absolute right-1.5 top-1.5 size-7 rounded-full bg-white/90 shadow-sm hover:bg-white"
                onClick={() => removeImage(image.id)}
              >
                <X aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContactSelector({
  value,
  onChange,
}: {
  value: ContactType;
  onChange: (value: ContactType) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Куда прислать ответ?</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
        {contactOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 rounded-lg border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              value === option.value
                ? "border-foreground bg-foreground text-background"
                : "border-input bg-background hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function RequestSpecificFields({
  type,
  clearError,
}: {
  type: ServiceRequestType;
  clearError: () => void;
}) {
  if (type === "auction") {
    return (
      <>
        <FormField label="Ссылка на лот">
          <Input
            name="lotUrl"
            type="url"
            maxLength={2000}
            placeholder="https://..."
            inputMode="url"
            className="h-11 px-3"
            onChange={clearError}
          />
        </FormField>
        <FormField label="Максимальная ставка / бюджет, JPY">
          <Input
            name="maxBidJpy"
            type="number"
            min="1"
            step="1"
            placeholder="Например, 50000"
            className="h-11 px-3"
            onChange={clearError}
          />
        </FormField>
        <CommentField clearError={clearError} />
      </>
    );
  }

  if (type === "ticket") {
    return (
      <>
        <FormField label="Название события">
          <Input
            name="eventName"
            maxLength={500}
            placeholder="Концерт, фестиваль или другое событие"
            className="h-11 px-3"
            onChange={clearError}
          />
        </FormField>
        <FormField label="Ссылка на событие">
          <Input
            name="eventUrl"
            type="url"
            maxLength={2000}
            placeholder="https://..."
            inputMode="url"
            className="h-11 px-3"
            onChange={clearError}
          />
        </FormField>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="Дата">
            <Input
              name="eventDate"
              type="date"
              className="h-11 px-3"
              onChange={clearError}
            />
          </FormField>
          <FormField label="Город / место">
            <Input
              name="location"
              maxLength={500}
              placeholder="Токио, Tokyo Dome"
              className="h-11 px-3"
              onChange={clearError}
            />
          </FormField>
          <FormField label="Количество билетов">
            <Input
              name="quantity"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue="1"
              className="h-11 px-3"
              onChange={clearError}
            />
          </FormField>
          <FormField label="Бюджет, JPY">
            <Input
              name="budgetJpy"
              type="number"
              min="1"
              step="1"
              placeholder="Например, 30000"
              className="h-11 px-3"
              onChange={clearError}
            />
          </FormField>
        </div>
        <CommentField clearError={clearError} />
      </>
    );
  }

  return (
    <>
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
          onChange={clearError}
        />
      </FormField>
      <FormField label="Описание запроса" required>
        <Textarea
          name="description"
          required
          maxLength={4000}
          placeholder="Например: Ищу редкую фигурку, карточку или одежду определённой модели. Можно б/у в хорошем состоянии..."
          className="min-h-36"
          onChange={clearError}
        />
      </FormField>
    </>
  );
}

function CommentField({ clearError }: { clearError: () => void }) {
  return (
    <FormField label="Комментарий">
      <Textarea
        name="comment"
        maxLength={4000}
        placeholder="Дополнительные пожелания"
        className="min-h-28"
        onChange={clearError}
      />
    </FormField>
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

function buildPayload(
  type: ServiceRequestType,
  contactType: ContactType,
  form: FormData,
): Record<string, string | number | null> {
  const common = {
    contactType,
    contact: getString(form, "contact"),
    customerName: getString(form, "customerName"),
  };

  if (type === "auction") {
    return {
      ...common,
      lotUrl: getString(form, "lotUrl"),
      maxBidJpy: getOptionalNumber(form, "maxBidJpy"),
      comment: getString(form, "comment") || null,
    };
  }

  if (type === "ticket") {
    return {
      ...common,
      eventName: getString(form, "eventName"),
      eventUrl: getString(form, "eventUrl") || null,
      eventDate: getString(form, "eventDate") || null,
      location: getString(form, "location") || null,
      quantity: getOptionalNumber(form, "quantity") ?? 0,
      budgetJpy: getOptionalNumber(form, "budgetJpy"),
      comment: getString(form, "comment") || null,
    };
  }

  return {
    ...common,
    productUrl: getString(form, "productUrl") || null,
    description: getString(form, "description"),
  };
}

function buildRequestBody(
  payload: Record<string, string | number | null>,
  images: SelectedImage[],
): FormData {
  const body = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null) body.append(key, String(value));
  });

  images.forEach((image) => body.append("images", image.file, image.file.name));
  return body;
}

function validatePayload(
  type: ServiceRequestType,
  payload: Record<string, string | number | null>,
): string | null {
  if (!payload.contact) {
    return "Заполните контакт для выбранного способа связи.";
  }

  if (type === "individual") {
    if (!payload.customerName) return "Укажите, как к вам обращаться.";
    if (!payload.description) return "Опишите, какой товар вы ищете.";
  }

  const urlValue =
    type === "auction"
      ? payload.lotUrl
      : type === "ticket"
        ? payload.eventUrl
        : payload.productUrl;

  if (typeof urlValue === "string" && urlValue && !isHttpUrl(urlValue)) {
    return "Укажите корректную ссылку.";
  }

  return null;
}

function getString(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

function getOptionalNumber(form: FormData, name: string): number | null {
  const value = getString(form, name);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
