import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-1 items-center px-4 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Товар не найден</CardTitle>
            <CardDescription>В демо-каталоге нет такой позиции.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<Link href="/" />}>Вернуться в каталог</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
