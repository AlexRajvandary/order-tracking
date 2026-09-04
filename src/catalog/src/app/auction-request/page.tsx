import type { Metadata } from "next";
import { ServiceRequestForm } from "@/components/service-request-form";
import { ServiceRequestPage } from "@/components/service-request-page";

export const metadata: Metadata = {
  title: "Заявка на аукцион",
  description: "Оставьте заявку на участие в японском аукционе.",
};

export default function AuctionRequestPage() {
  return (
    <ServiceRequestPage
      title="Аукцион"
      description="Пришлите ссылку на интересующий лот. Мы проверим условия и поможем сделать ставку и выкупить товар."
      hint="Максимальную ставку можно указать сразу или согласовать после проверки лота."
    >
      <ServiceRequestForm type="auction" />
    </ServiceRequestPage>
  );
}
