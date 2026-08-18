import { proxyCatalogState } from "../proxy";

export async function GET(request: Request) {
  return proxyCatalogState(request, "/api/catalog/cart");
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { productId?: string; quantity?: number };
  if (!body.productId) return new Response("productId is required", { status: 400 });
  return proxyCatalogState(request, `/api/catalog/cart/items/${encodeURIComponent(body.productId)}`, {
    method: "PUT",
    body: JSON.stringify({ quantity: body.quantity ?? 0 }),
  });
}

export async function DELETE(request: Request) {
  return proxyCatalogState(request, "/api/catalog/cart", { method: "DELETE" });
}
