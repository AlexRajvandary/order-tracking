import type { Metadata } from "next";
import { ServiceRequestForm } from "@/components/service-request-form";
import { ServiceRequestPage } from "@/components/service-request-page";

export const metadata: Metadata = {
  title: "Найти товар",
  description: "Поможем подобрать подходящий товар по вашим требованиям и бюджету.",
};

export default function FindProductPage() {
  return (
    <ServiceRequestPage
      title="Найти товар"
      description="Расскажите, что вы хотите купить, даже если ещё не определились с конкретной моделью. Укажите ваши пожелания, бюджет и важные характеристики — наш специалист найдёт подходящие варианты в Японии, Европе, США, Китае и других странах."
    >
      <div className="mb-6 rounded-2xl border border-border bg-white p-5 text-sm leading-6 text-muted-foreground shadow-sm sm:p-6">
        <p className="font-medium text-foreground">Что можно указать:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>какой товар вам нужен;</li>
          <li>для чего вы планируете его использовать;</li>
          <li>желаемый бюджет;</li>
          <li>важные характеристики, бренд, размер, цвет или другие пожелания;</li>
          <li>примеры или фотографии того, что вам нравится.</li>
        </ul>
        <p className="mt-4">
          Не обязательно знать точное название или модель — специалист поможет
          определиться и предложит подходящие варианты.
        </p>
      </div>
      <ServiceRequestForm type="find-product" />
    </ServiceRequestPage>
  );
}
