import { RakutenSearch } from "./rakuten-search";

export default function RakutenPage() {
  return <main className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
    <div className="mb-8"><h1 className="text-3xl font-semibold">Товары Rakuten</h1>
      <p className="mt-2 text-muted-foreground">Живой поиск по Rakuten. Цена и доступность будут проверены ещё раз перед созданием заказа.</p></div>
    <RakutenSearch />
  </main>;
}
