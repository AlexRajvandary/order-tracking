import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const VISITOR_COOKIE = "the-get-catalog-visitor";

function productsApiBaseUrl(): string {
  return (
    process.env.PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    "https://89-127-208-99.sslip.io"
  );
}

export async function proxyCatalogState(
  request: Request,
  path: string,
  init: RequestInit = {},
) {
  const cookieStore = await cookies();
  let visitor = cookieStore.get(VISITOR_COOKIE)?.value;
  let isNewVisitor = false;
  if (!visitor) {
    visitor = randomUUID().replaceAll("-", "");
    isNewVisitor = true;
  }

  const headers = new Headers(init.headers);
  headers.set("X-Catalog-Visitor", visitor);
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let upstream: Response;
  try {
    upstream = await fetch(`${productsApiBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Catalog state service is unavailable." }, { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
  if (isNewVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitor, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return response;
}
