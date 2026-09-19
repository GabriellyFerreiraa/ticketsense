// Supabase Edge Function (Deno runtime)
// Receives a ticket's title + description, asks Gemini to classify it,
// and returns structured JSON. The Gemini API key never reaches the browser —
// it lives only in this function's environment variables (set via `supabase secrets set`).
//
// Requires a real logged-in user (not just the public anon key) and
// applies a simple per-user rate limit, since this endpoint triggers a
// billed call to Gemini on every request.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Known frontend origins. Add your own if you deploy this elsewhere.
const ALLOWED_ORIGINS = new Set([
  "https://ticketsense.netlify.app",
  "http://localhost:5173",
  "http://localhost:8080",
]);

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const GEMINI_TIMEOUT_MS = 20 * 1000;

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : Array.from(ALLOWED_ORIGINS)[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

const SYSTEM_PROMPT = `You are a support ticket triage assistant for an IT service desk.
Given a ticket's title and description, respond with ONLY a JSON object (no markdown, no preamble) in this exact shape:

{
  "category": "hardware" | "software" | "network" | "access" | "other",
  "urgency": "low" | "medium" | "high" | "critical",
  "suggested_steps": ["step 1", "step 2", "step 3"]
}

Guidelines:
- "critical" urgency means a full outage or a security issue affecting multiple people.
- "suggested_steps" should be 2 to 4 short, concrete first-response diagnostic steps a support agent could try before escalating.
- If the ticket is vague, still make your best guess rather than refusing.`;

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Require a real authenticated user, not just the anon key ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = userData.user.id;

    // --- Per-user rate limit, tracked in Postgres via the service role ---
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const now = Date.now();
    const { data: rateRow } = await adminClient
      .from("classify_ticket_rate_limits")
      .select("window_start, request_count")
      .eq("user_id", userId)
      .maybeSingle();

    const windowStart = rateRow ? new Date(rateRow.window_start).getTime() : 0;
    const windowExpired = now - windowStart > RATE_LIMIT_WINDOW_MS;
    const nextCount = windowExpired ? 1 : (rateRow?.request_count ?? 0) + 1;

    if (!windowExpired && nextCount > RATE_LIMIT_MAX_REQUESTS) {
      return new Response(
        JSON.stringify({ error: "Too many classification requests. Try again in a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await adminClient.from("classify_ticket_rate_limits").upsert({
      user_id: userId,
      window_start: windowExpired ? new Date(now).toISOString() : rateRow!.window_start,
      request_count: nextCount,
    });

    // --- Validate input ---
    const { title, description } = await req.json();

    if (typeof title !== "string" || typeof description !== "string" || !title.trim() || !description.trim()) {
      return new Response(
        JSON.stringify({ error: "title and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (title.length > MAX_TITLE_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `title must be ${MAX_TITLE_LENGTH} characters or fewer, description ${MAX_DESCRIPTION_LENGTH} or fewer` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "Server is missing GEMINI_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), GEMINI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: `Title: ${title}\n\nDescription: ${description}` }],
              },
            ],
            generationConfig: {
              // Ask Gemini to return raw JSON directly, skipping the "strip markdown fences" step entirely
              responseMimeType: "application/json",
              temperature: 0.3,
            },
          }),
          signal: timeoutController.signal,
        }
      );
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "AI classification timed out" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI classification failed", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let classification;
    try {
      classification = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Could not parse AI response:", rawText);
      return new Response(
        JSON.stringify({ error: "Could not parse AI response", raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("classify-ticket error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      { status: 500, headers: { ...corsHeadersFor(req), "Content-Type": "application/json" } }
    );
  }
});
