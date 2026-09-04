import type { Metadata } from "next";
import { ServiceRequestForm } from "@/components/service-request-form";
import { ServiceRequestPage } from "@/components/service-request-page";

export const metadata: Metadata = {
  title: "Заявка на билеты",
  description: "Оставьте заявку на покупку билетов на событие в Японии.",
};

export default function TicketRequestPage() {
  return (
    <ServiceRequestPage
      title="Билеты"
      description="Расскажите, на какое событие нужны билеты. Мы проверим доступность и свяжемся с вами."
      hint="Если известны дата, площадка или ссылка на событие, укажите их в форме."
    >
      <ServiceRequestForm type="ticket" />
    </ServiceRequestPage>
  );
}
