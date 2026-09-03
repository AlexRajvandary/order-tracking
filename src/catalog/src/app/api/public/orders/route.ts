function orderApiBaseUrl(): string {
  return (
    process.env.ORDER_TRACKING_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_ORDER_TRACKING_API_BASE_URL?.replace(/\/$/, "") ||
    "https://89-127-208-99.sslip.io"
  );
}

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const response = await fetch(`${orderApiBaseUrl()}/api/v1/public/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" },
    });
  } catch {
    return Response.json(
      { title: "Сервис оформления заявки временно недоступен" },
      { status: 502 },
    );
  }
}
