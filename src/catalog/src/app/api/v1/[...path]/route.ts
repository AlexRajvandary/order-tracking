import type { NextRequest } from "next/server";

function apiBaseUrl() {
  return (
    process.env.ORDER_TRACKING_API_BASE_URL?.replace(/\/$/, "") ||
    (process.env.NODE_ENV === "development" ? "http://localhost:8080" : "https://api.the-get.ru")
  );
}

async function forward(request: NextRequest) {
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `${apiBaseUrl()}/`);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  try {
    const upstream = await fetch(url, { method: request.method, headers, body, cache: "no-store", redirect: "manual" });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("transfer-encoding");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ title: "Сервис временно недоступен" }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
