"use client";
import Link from "next/link";
import { useCustomerAccount } from "@/components/customer-account-provider";
export default function AccountPage() {
  const { user, ready } = useCustomerAccount();
  return <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10"><h1 className="text-3xl font-semibold">Личный кабинет</h1>{!ready ? <p className="mt-4 text-muted-foreground">Загрузка…</p> : user ? <div className="mt-7 grid gap-4 sm:grid-cols-2"><Link className="rounded-xl border p-5 hover:bg-muted/40" href="/account/orders"><strong>Заказы</strong><p className="mt-1 text-sm text-muted-foreground">История и статусы ваших заявок</p></Link><Link className="rounded-xl border p-5 hover:bg-muted/40" href="/account/settings"><strong>Настройки</strong><p className="mt-1 text-sm text-muted-foreground">Контакты, Telegram, уведомления и адреса</p></Link></div> : <div className="mt-5 rounded-xl border p-5"><p>Войдите или создайте кабинет, чтобы отслеживать заявки.</p><div className="mt-4 flex gap-3"><Link className="rounded-lg bg-black px-4 py-2 text-white" href="/login">Войти</Link><Link className="rounded-lg border px-4 py-2" href="/register">Регистрация</Link></div></div>}</main>;
}
