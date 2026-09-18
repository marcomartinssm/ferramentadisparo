import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, apiKey, voiceId, model, stability, similarityBoost, speed } = await req.json();

    if (!apiKey) throw new Error('API Key é obrigatória');
    if (!text) throw new Error('Texto é obrigatório');

    const startTime = Date.now();

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || '33B4UnXyTNbgLmdEDh5P'}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: model || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: Math.max(0, Math.min(1, stability ?? 0.75)),
            similarity_boost: Math.max(0, Math.min(1, similarityBoost ?? 0.8)),
            speed: Math.max(0.7, Math.min(1.2, speed ?? 1.0)),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = base64Encode(audioBuffer);
    const durationMs = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      audioBase64,
      duration_ms: durationMs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
