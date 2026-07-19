// Supabase Edge Function (Deno runtime)
// Receives a ticket's title + description, asks Claude to classify it,
// and returns structured JSON. The Anthropic API key never reaches the browser —
// it lives only in this function's environment variables (set via `supabase secrets set`).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();

    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: "title and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "Server is missing ANTHROPIC_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Title: ${title}\n\nDescription: ${description}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI classification failed", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? "";

    let classification;
    try {
      // Claude sometimes wraps JSON in ```json fences despite instructions — strip them defensively
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      classification = JSON.parse(cleaned);
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
