// Supabase Edge Function (Deno runtime)
// Receives a ticket's title + description, asks Gemini to classify it,
// and returns structured JSON. The Gemini API key never reaches the browser —
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

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "Server is missing GEMINI_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
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
      }
    );

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
