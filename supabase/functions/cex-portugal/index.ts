const allowedOrigins = new Set(["https://catering1.github.io", "https://vertice-unificado.vercel.app", "http://localhost:5173", "http://localhost:8080"]);

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const headers = new Headers({ "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" });
  if (origin && allowedOrigins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (origin && !allowedOrigins.has(origin)) return Response.json({ error: "Origem não autorizada." }, { status: 403, headers });
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405, headers });
  try {
    const { query, boxId } = await request.json();
    if (boxId != null && (typeof boxId !== "string" || !/^[a-zA-Z0-9_-]{2,60}$/.test(boxId))) return Response.json({ error: "Referência inválida." }, { status: 400, headers });
    if (boxId == null && (typeof query !== "string" || query.trim().length < 2 || query.length > 120)) return Response.json({ error: "Pesquisa inválida." }, { status: 400, headers });
    const url = boxId ? new URL(`https://wss2.cex.pt.webuy.io/v3/boxes/${encodeURIComponent(boxId)}/detail`) : new URL("https://wss2.cex.pt.webuy.io/v3/boxes");
    if (!boxId) url.search = new URLSearchParams({ q: query.trim(), firstRecord: "1", count: "20", sortBy: "relevance", sortOrder: "desc" }).toString();
    const upstream = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!upstream.ok) throw new Error(`CeX HTTP ${upstream.status}`);
    const payload = await upstream.json();
    const boxes = boxId ? payload?.response?.data?.boxDetails : payload?.response?.data?.boxes;
    if (payload?.response?.ack !== "Success" || !Array.isArray(boxes)) throw new Error("Resposta CeX inválida");
    const items = boxes.flatMap((box: Record<string, unknown>) => {
      const id = box.boxId;
      const name = box.boxName;
      const price = Number(box.sellPrice);
      if (typeof id !== "string" || typeof name !== "string" || !Number.isFinite(price) || price < 0) return [];
      return [{ id, name, sellPrice: price, cashPrice: Number(box.cashPrice) || null, exchangePrice: Number(box.exchangePrice) || null }];
    });
    return Response.json({ items, checkedAt: new Date().toISOString() }, { headers });
  } catch {
    return Response.json({ error: "Não foi possível consultar a CeX Portugal neste momento." }, { status: 502, headers });
  }
});
