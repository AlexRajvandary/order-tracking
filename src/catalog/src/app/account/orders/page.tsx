"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCustomerAccount } from "@/components/customer-account-provider";

type Order = {
  id: string;
  trackingCode: string;
  status: string;
  createdAt: string;
  items: Array<{ name: string; description?: string; quantity: number }>;
};

export default function AccountOrdersPage() {
  const { token, ready, user } = useCustomerAccount();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    void fetch("/api/v1/customer-account/orders", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить заказы");
        setOrders(await response.json());
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, [token]);

  return (
    <main className="mx-auto w-full max-w-[820px] flex-1 px-4 py-4 sm:px-6 sm:py-8">
      <h1 className="text-[30px] font-semibold tracking-tight text-[#111] sm:text-[34px]">
        Заказы
      </h1>
      {!ready ? (
        <p className="mt-5 text-sm text-neutral-500">Загрузка…</p>
      ) : !user ? (
        <p className="mt-5 text-sm text-neutral-600">Войдите в кабинет, чтобы увидеть заявки.</p>
      ) : error ? (
        <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>
      ) : orders.length ? (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>Заявка № {order.trackingCode}</strong>
                <span className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <p className="mt-2 text-sm">Статус: {order.status}</p>
              <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
                {order.items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    {item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-12 flex max-w-[840px] flex-col items-start gap-6 sm:gap-8 lg:flex-row lg:items-center lg:gap-14">
          <Image
            src="/assets/orders-empty.png"
            alt=""
            width={520}
            height={366}
            className="h-auto w-[240px] max-w-full shrink-0 object-contain sm:w-[280px] lg:w-[320px] lg:max-w-[40%]"
          />
          <div className="w-full">
            <h2 className="text-xl font-semibold text-[#111]">У вас пока нет заказов.</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500 sm:text-base">
              Когда вы оформите заявку, она появится здесь.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white transition hover:bg-[#1a1a1a] sm:w-auto"
            >
              Перейти к товарам
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
