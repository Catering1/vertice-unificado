import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dashboardData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `És um analista de negócios especializado em e-commerce e revenda. Analisa os dados do dashboard fornecidos e gera 5-8 insights acionáveis em português de Portugal. 

Para cada insight, usa este formato:
- Começa com um emoji relevante (📈, ⚠️, 💡, 🎯, 📊, 🔄, 💰, 🏆, etc.)
- Título curto em negrito
- Explicação concisa e acionável

Foca-te em:
1. Saúde geral do negócio
2. Oportunidades de melhoria
3. Alertas e riscos
4. Eficiência operacional
5. Recomendações estratégicas

Sê direto, prático e baseado nos números fornecidos.`;

    const userPrompt = `Analisa os seguintes dados do meu dashboard de negócio:

- Total Compras: ${dashboardData.totalPurchases}€
- Total Vendas: ${dashboardData.totalSales}€
- Lucro Total: ${dashboardData.totalProfit}€
- Margem Média: ${dashboardData.avgMargin}%
- ROI Total: ${dashboardData.roiTotal}%
- ROI Realizado: ${dashboardData.roiRealized}%
- Stock Turnover: ${dashboardData.stockTurnover}
- Valor em Stock: ${dashboardData.stockValue}€
- Tempo Médio de Venda: ${dashboardData.avgVelocity} dias
- Lucro Médio por Venda: ${dashboardData.avgProfitPerSale}€
- Número de Produtos: ${dashboardData.productCount}
- Top 5 Produtos (por quantidade vendida): ${dashboardData.topProducts}

Gera os insights agora.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tenta novamente mais tarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adiciona fundos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao contactar IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
