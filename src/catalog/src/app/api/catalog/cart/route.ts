import { proxyCatalogState } from "../proxy";

export async function GET(request: Request) {
  return proxyCatalogState(request, "/api/catalog/cart");
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { source?: string; productId?: string; externalId?: string; quantity?: number };
  if (body.source === "Rakuten") {
    if (!body.externalId) return new Response("externalId is required", { status: 400 });
    return proxyCatalogState(request, "/api/catalog/cart/external/rakuten", { method: "PUT", body: JSON.stringify({ externalId: body.externalId, quantity: body.quantity ?? 0 }) });
  }
  if (!body.productId) return new Response("productId is required", { status: 400 });
  return proxyCatalogState(request, `/api/catalog/cart/items/${encodeURIComponent(body.productId)}`, {
    method: "PUT",
    body: JSON.stringify({ quantity: body.quantity ?? 0 }),
  });
}

export async function DELETE(request: Request) {
  return proxyCatalogState(request, "/api/catalog/cart", { method: "DELETE" });
}
