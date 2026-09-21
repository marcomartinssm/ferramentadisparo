import { exigirAcesso } from "../_shared/auth.ts";
import { aiFetch } from "../_shared/ai.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const bloqueio = await exigirAcesso(req, corsHeaders);
  if (bloqueio) return bloqueio;

  try {
    const { headers, sampleRows } = await req.json();

    const systemPrompt = `Você é um assistente que mapeia colunas de CSV para campos de contato.
Campos disponíveis: phone (telefone/celular), name (nome), company (empresa), city (cidade), tags (etiquetas), status.
Colunas que não correspondem a nenhum destes campos devem ser listadas em "custom_fields" para serem salvas como campos personalizados.

IMPORTANTE: Responda APENAS com JSON válido, sem markdown, sem explicação.`;

    const userPrompt = `Colunas CSV: ${JSON.stringify(headers)}
Dados exemplo (3 primeiras linhas): ${JSON.stringify(sampleRows)}

Mapeie cada coluna. Retorne JSON: {"mapping": {"phone": "coluna_telefone", "name": "coluna_nome", ...}, "custom_fields": ["col_extra1", "col_extra2"]}
Apenas inclua no mapping campos que realmente correspondem. Não force mapeamentos errados.`;

    const response = await aiFetch("claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-column-mapper error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});