import { NextResponse } from "next/server";

function productsApiBaseUrl() {
  return (process.env.PRODUCTS_API_BASE_URL || process.env.NEXT_PUBLIC_PRODUCTS_API_BASE_URL || "http://localhost:5281").replace(/\/$/, "");
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const target = `${productsApiBaseUrl()}/api/products/external/rakuten/search?${incoming.searchParams}`;
  try {
    const response = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(18_000) });
    const body = await response.text();
    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ title: "Ошибка сервера каталога", detail: `Products API вернул HTTP ${response.status} вместо JSON. Проверьте логи products-api.` }, { status: response.ok ? 502 : response.status });
    }
    return new NextResponse(body, { status: response.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ title: "Rakuten временно недоступен" }, { status: 503 });
  }
}
