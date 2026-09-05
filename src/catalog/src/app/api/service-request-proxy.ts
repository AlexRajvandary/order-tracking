function orderApiBaseUrl(): string {
  return (
    process.env.ORDER_TRACKING_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_ORDER_TRACKING_API_BASE_URL?.replace(/\/$/, "") ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:8080"
      : "https://89-127-208-99.sslip.io")
  );
}

export async function proxyServiceRequest(
  request: Request,
  endpoint: "individual-requests" | "auction-requests" | "ticket-requests",
) {
  const body = await request.arrayBuffer();
  const contentType = request.headers.get("content-type");

  try {
    const response = await fetch(
      `${orderApiBaseUrl()}/api/v1/public/${endpoint}`,
      {
        method: "POST",
        headers: contentType ? { "Content-Type": contentType } : undefined,
        body,
        cache: "no-store",
      },
    );

    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch {
    return Response.json(
      { title: "Сервис заявок временно недоступен" },
      { status: 502 },
    );
  }
}
