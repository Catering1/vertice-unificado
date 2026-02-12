import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const { email } = await req.json();
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("allowed_emails")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error) throw error;

    // Add random delay to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));

    return new Response(JSON.stringify({ allowed: !!data }), {
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
