const allowedOrigins = new Set([
  "https://catering1.github.io",
  "https://vertice-unificado.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
]);

function corsHeaders(origin: string | null) {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  });
  if (origin && allowedOrigins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

const systemPrompt = `És um analista de negócios especializado em compra de produtos para revenda. Analisa os dados enviados pelo dashboard e gera 5 a 8 insights acionáveis em português de Portugal.

Escreve cada insight numa linha separada, iniciada por um marcador, emoji e título curto em negrito. Distingue valores históricos de stock atual. Usa apenas os números fornecidos e não inventes unidades, percentagens, causas ou conclusões sobre tesouraria. Se faltar informação para uma conclusão, indica o que falta. Foca-te em margem, lucro, rotação e oportunidades de compra e venda.`;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (origin && !allowedOrigins.has(origin)) {
    return Response.json({ error: "Origem não autorizada." }, { status: 403, headers });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "Método não permitido." }, { status: 405, headers });
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("AI_API_KEY");
  if (!geminiKey && !openAiKey) {
    return Response.json({
      error: "A análise por IA ainda não está configurada. Define GEMINI_API_KEY nos secrets das Edge Functions do Supabase.",
    }, { status: 503, headers });
  }

  try {
    const body = await req.json();
    const dashboardData = body?.dashboardData;
    if (!dashboardData || typeof dashboardData !== "object" || Array.isArray(dashboardData)) {
      return Response.json({ error: "Dados do dashboard inválidos." }, { status: 400, headers });
    }

    if (geminiKey) {
      const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: `Analisa os seguintes dados do meu dashboard de negócio:\n\n${JSON.stringify(dashboardData)}` }] }],
          generationConfig: { maxOutputTokens: 1400 },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) {
        console.error("Gemini provider error:", response.status, (await response.text()).slice(0, 1000));
        return Response.json({ error: response.status === 429 ? "Limite gratuito do Gemini atingido. Tenta novamente mais tarde." : "Não foi possível analisar os dados com Gemini. Verifica a chave e o modelo." }, { status: response.status === 429 ? 429 : 502, headers });
      }
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
      if (!text) return Response.json({ error: "O Gemini não devolveu uma análise." }, { status: 502, headers });
      return Response.json({ text, provider: "Gemini" }, { headers });
    }

    const endpoint = Deno.env.get("AI_CHAT_COMPLETIONS_URL") ?? "https://api.openai.com/v1/chat/completions";
    const model = Deno.env.get("AI_MODEL") ?? "gpt-4.1-mini";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analisa os seguintes dados do meu dashboard de negócio:\n\n${JSON.stringify(dashboardData)}` },
        ],
        stream: true,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("AI provider error:", response.status, details.slice(0, 1000));
      return Response.json({
        error: response.status === 429
          ? "Limite de pedidos da IA excedido. Tenta novamente mais tarde."
          : "Não foi possível analisar o dashboard. Verifica a chave e a configuração do fornecedor de IA.",
      }, { status: response.status === 429 ? 429 : 502, headers });
    }

    const streamHeaders = new Headers(headers);
    streamHeaders.set("Content-Type", "text/event-stream; charset=utf-8");
    streamHeaders.set("Cache-Control", "no-cache");
    return new Response(response.body, { headers: streamHeaders });
  } catch (error) {
    console.error("analyze-dashboard error:", error);
    return Response.json({ error: "Erro ao analisar os dados do dashboard." }, { status: 500, headers });
  }
});
