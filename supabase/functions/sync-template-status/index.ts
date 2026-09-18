import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all PENDING templates that have a meta_template_id
    const { data: pendingTemplates, error: fetchErr } = await supabase
      .from("meta_templates")
      .select("id, meta_template_id, meta_connection_id, status")
      .eq("status", "PENDING")
      .not("meta_template_id", "is", null);

    if (fetchErr) throw fetchErr;
    if (!pendingTemplates || pendingTemplates.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by meta_connection_id to cache access tokens
    const connectionIds = [...new Set(pendingTemplates.map((t) => t.meta_connection_id).filter(Boolean))];

    const tokenMap: Record<string, string> = {};
    for (const connId of connectionIds) {
      const { data: conn } = await supabase
        .from("meta_connections")
        .select("access_token")
        .eq("id", connId)
        .single();
      if (conn?.access_token) {
        tokenMap[connId] = conn.access_token;
      }
    }

    let updated = 0;

    for (const template of pendingTemplates) {
      const token = template.meta_connection_id ? tokenMap[template.meta_connection_id] : null;
      if (!token || !template.meta_template_id) continue;

      try {
        const res = await fetch(
          `${GRAPH_API}/${template.meta_template_id}?access_token=${token}`
        );
        const data = await res.json();

        if (data.status && data.status !== template.status) {
          await supabase
            .from("meta_templates")
            .update({ status: data.status, updated_at: new Date().toISOString() })
            .eq("id", template.id);
          updated++;
          console.log(`Template ${template.id} updated: ${template.status} -> ${data.status}`);
        }
      } catch (apiErr) {
        console.error(`Error fetching status for template ${template.id}:`, apiErr);
      }
    }

    return new Response(JSON.stringify({ updated, checked: pendingTemplates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-template-status error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
