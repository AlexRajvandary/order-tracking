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
    return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" } });
  } catch {
    return NextResponse.json({ title: "Rakuten временно недоступен" }, { status: 503 });
  }
}
