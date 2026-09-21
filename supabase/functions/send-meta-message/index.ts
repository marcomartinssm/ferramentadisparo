import { exigirAcesso } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API_VERSION = "v22.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const bloqueio = await exigirAcesso(req, corsHeaders);
  if (bloqueio) return bloqueio;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const {
      instance_id,
      meta_connection_id,
      phone_number,
      content,
      message_type = "text",
      media_url,
      file_name,
      template_name,
      template_language,
      template_variables,
      header_media,
      source = "flow",
      source_id = null,
    } = await req.json();

    if (!phone_number) throw new Error("phone_number is required");

    // Resolve Meta connection: via instance_id or direct meta_connection_id
    let connection: { waba_id: string; access_token: string; phone_number_id: string };

    if (meta_connection_id) {
      const { data: conn, error } = await supabase
        .from("meta_connections")
        .select("waba_id, access_token, phone_number_id")
        .eq("id", meta_connection_id)
        .eq("is_active", true)
        .single();
      if (error || !conn) throw new Error("Meta connection not found");
      connection = conn;
    } else if (instance_id) {
      // Look up instance → meta_connection
      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .select("id, meta_connection_id, status")
        .eq("id", instance_id)
        .single();
      if (error || !instance) throw new Error("Instance not found");
      if (!instance.meta_connection_id) throw new Error("Instance has no Meta connection linked");

      const { data: conn, error: connErr } = await supabase
        .from("meta_connections")
        .select("waba_id, access_token, phone_number_id")
        .eq("id", instance.meta_connection_id)
        .eq("is_active", true)
        .single();
      if (connErr || !conn) throw new Error("Meta connection not found for instance");
      connection = conn;
    } else {
      throw new Error("instance_id or meta_connection_id is required");
    }

    if (!connection.phone_number_id) {
      throw new Error("Phone Number ID not configured in Meta connection");
    }

    const cleanPhone = phone_number.replace(/\D/g, "");
    let metaPayload: any;

    // Build payload based on message_type
    if (message_type === "template" && template_name) {
      // Template message (works outside 24h window)
      const templateObj: any = {
        name: template_name,
        language: { code: template_language || "pt_BR" },
      };

      const components: any[] = [];
      const vars = template_variables || {};

      // Media header
      if (header_media?.type && header_media?.url) {
        const mediaType = header_media.type.toLowerCase();
        const param: any = { type: mediaType };
        if (mediaType === "image") param.image = { link: header_media.url };
        else if (mediaType === "video") param.video = { link: header_media.url };
        else if (mediaType === "document") param.document = { link: header_media.url };
        components.push({ type: "header", parameters: [param] });
      } else if (vars.header?.length > 0) {
        components.push({
          type: "header",
          parameters: vars.header.map((v: string) => ({ type: "text", text: v })),
        });
      }

      if (vars.body?.length > 0) {
        components.push({
          type: "body",
          parameters: vars.body.map((v: string) => ({ type: "text", text: v })),
        });
      }

      if (components.length > 0) templateObj.components = components;

      metaPayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: templateObj,
      };
    } else if (message_type === "image" && media_url) {
      metaPayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "image",
        image: { link: media_url, caption: content || "" },
      };
    } else if (message_type === "document" && media_url) {
      metaPayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "document",
        document: { link: media_url, caption: content || "", filename: file_name || "document" },
      };
    } else if (message_type === "audio" && media_url) {
      metaPayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "audio",
        audio: { link: media_url },
      };
    } else {
      // Default: text message (only works within 24h window)
      metaPayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: content || "" },
      };
    }

    console.log(`[send-meta-message] Sending ${message_type} to ${cleanPhone}`);

    const metaResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${connection.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      }
    );

    const metaResult = await metaResponse.json();
    console.log(`[send-meta-message] Meta response: ${JSON.stringify(metaResult).substring(0, 500)}`);

    if (!metaResponse.ok) {
      const errorMsg = metaResult?.error?.message || "Unknown Meta API error";
      throw new Error(`Meta API error (${metaResponse.status}): ${errorMsg}`);
    }

    const messageId = metaResult?.messages?.[0]?.id || null;

    // Registra a mensagem enviada na conversa do contato (tela Conversas)
    try {
      const contactId = await encontrarOuCriarContato(supabase, cleanPhone);
      if (contactId) {
        await supabase.from("conversation_messages").insert({
          contact_id: contactId,
          direction: "outbound",
          content: content || (template_name ? `[Template: ${template_name}]` : ""),
          source,
          source_id,
          instance_id: instance_id || null,
          media_url: header_media?.url || media_url || null,
          message_id: messageId,
          message_type,
          status: "sent",
        });
      }
    } catch (convErr) {
      console.warn(`[send-meta-message] Falha ao registrar conversa: ${convErr}`);
    }

    return new Response(
      JSON.stringify({ success: true, messageId, data: metaResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[send-meta-message] Error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function encontrarOuCriarContato(supabase: any, phone: string): Promise<string | null> {
  const variants = new Set([phone, `+${phone}`]);
  if (phone.startsWith("55") && phone.length >= 12) {
    const ddd = phone.substring(2, 4);
    const local = phone.substring(4);
    if (local.length === 8) { variants.add(`55${ddd}9${local}`); variants.add(`+55${ddd}9${local}`); }
    if (local.length === 9 && local.startsWith("9")) { variants.add(`55${ddd}${local.substring(1)}`); variants.add(`+55${ddd}${local.substring(1)}`); }
  }
  const { data: existente } = await supabase
    .from("contacts")
    .select("id")
    .in("phone", Array.from(variants))
    .limit(1)
    .maybeSingle();
  if (existente?.id) return existente.id;
  const { data: novo } = await supabase
    .from("contacts")
    .insert({ name: phone, phone, status: "novo" })
    .select("id")
    .maybeSingle();
  return novo?.id || null;
}
