const allowedOrigins = [
  "https://catering1.github.io",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : "https://catering1.github.io";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5000;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    // Rate limiting by IP
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const now = Date.now();
    const lastRequest = rateLimitMap.get(clientIP) || 0;
    if (now - lastRequest < RATE_LIMIT_MS) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }
    rateLimitMap.set(clientIP, now);

    const payload = await req.json();
    const email = payload?.email;
    if (!email || typeof email !== "string" || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
    const secretKey = secretKeysJson
      ? JSON.parse(secretKeysJson)["default"]
      : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !secretKey) throw new Error("Supabase server credentials are not configured");
    const query = new URL(`${supabaseUrl}/rest/v1/allowed_emails`);
    query.searchParams.set("select", "id");
    query.searchParams.set("email", `eq.${email.toLowerCase().trim()}`);
    query.searchParams.set("limit", "1");
    const result = await fetch(query, { headers: { apikey: secretKey } });
    if (!result.ok) throw new Error(`Email lookup failed (${result.status})`);
    const rows = await result.json();

    // Add random delay to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));

    return new Response(JSON.stringify({ allowed: Array.isArray(rows) && rows.length > 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    // Generic error - don't leak details
    return new Response(JSON.stringify({ allowed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
