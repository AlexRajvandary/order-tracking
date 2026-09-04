import type { Metadata } from "next";
import { IndividualRequestForm } from "@/components/individual-request-form";
import { ServiceRequestPage } from "@/components/service-request-page";

export const metadata: Metadata = {
  title: "Индивидуальный запрос",
  description:
    "Оставьте заявку на поиск и выкуп товара из Японии, которого нет в каталоге The Get.",
};

export default async function IndividualRequestPage() {
  return (
    <ServiceRequestPage
      title="Индивидуальный запрос"
      description="Не нашли нужный товар в каталоге? Оставьте заявку — мы попробуем найти и выкупить его для вас в Японии."
      hint="Пришлите ссылку, название или просто опишите, что вы ищете."
    >
      <IndividualRequestForm />
    </ServiceRequestPage>
  );
}
