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
    const { templateData, metaConnectionId, isEdit, templateId, metaTemplateId } = await req.json();

    if (!templateData || !metaConnectionId) {
      return new Response(JSON.stringify({ error: "templateData e metaConnectionId são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch Meta connection credentials
    const { data: connection, error: connError } = await supabase
      .from("meta_connections")
      .select("*")
      .eq("id", metaConnectionId)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Conexão Meta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { access_token, waba_id } = connection;
    const { name, category, language, components, samples, labels, validation_score } = templateData;

    // Build Meta API payload
    const metaComponents: any[] = [];

    for (const comp of components) {
      if (comp.type === "HEADER") {
        if (["IMAGE", "VIDEO", "DOCUMENT"].includes(comp.format) && comp.mediaUrl) {
          // Upload media to Meta (get handle)
          const handle = await uploadMediaToMeta(comp.mediaUrl, comp.format, access_token, waba_id);
          const example: any = {};
          if (comp.format === "IMAGE") example.header_handle = [handle];
          else if (comp.format === "VIDEO") example.header_handle = [handle];
          else if (comp.format === "DOCUMENT") example.header_handle = [handle];

          metaComponents.push({
            type: "HEADER",
            format: comp.format,
            example: { header_handle: [handle] },
          });
        } else if (comp.format === "TEXT" && comp.text) {
          const headerComp: any = { type: "HEADER", format: "TEXT", text: comp.text };
          // Extract variables from header text
          const headerVars = comp.text.match(/\{\{\d+\}\}/g);
          if (headerVars && samples?.headerSamples?.length) {
            headerComp.example = { header_text: samples.headerSamples };
          }
          metaComponents.push(headerComp);
        } else if (comp.format === "LOCATION") {
          metaComponents.push({ type: "HEADER", format: "LOCATION" });
        }
      } else if (comp.type === "BODY") {
        const bodyComp: any = { type: "BODY", text: comp.text };
        const bodyVars = comp.text.match(/\{\{\d+\}\}/g);
        if (bodyVars && samples?.bodySamples?.length) {
          bodyComp.example = { body_text: [samples.bodySamples] };
        }
        metaComponents.push(bodyComp);
      } else if (comp.type === "FOOTER") {
        metaComponents.push({ type: "FOOTER", text: comp.text });
      } else if (comp.type === "BUTTONS") {
        const buttons = comp.buttons.map((btn: any) => {
          const metaBtn: any = { type: btn.type, text: btn.text };
          if (btn.type === "URL") {
            metaBtn.url = btn.url;
            if (btn.url?.includes("{{1}}") && samples?.buttonUrlSamples?.length) {
              metaBtn.example = samples.buttonUrlSamples;
            }
          } else if (btn.type === "PHONE_NUMBER") {
            metaBtn.phone_number = btn.phone_number;
          } else if (btn.type === "COPY_CODE") {
            metaBtn.example = btn.example || "CODE123";
          } else if (btn.type === "OTP") {
            metaBtn.otp_type = btn.otp_type || "COPY_CODE";
          }
          return metaBtn;
        });
        metaComponents.push({ type: "BUTTONS", buttons });
      }
    }

    const metaPayload: any = {
      name,
      category,
      language,
      components: metaComponents,
    };

    // Submit to Meta API
    let metaResponse: Response;
    let metaResult: any;

    if (isEdit && metaTemplateId) {
      // Edit existing template
      metaResponse = await fetch(`${GRAPH_API}/${metaTemplateId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          components: metaComponents,
          category,
        }),
      });
    } else {
      // Create new template
      metaResponse = await fetch(`${GRAPH_API}/${waba_id}/message_templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      });
    }

    metaResult = await metaResponse.json();

    // Handle duplicate name error — retry with suffix
    if (
      !metaResponse.ok &&
      metaResult?.error?.code === 100 &&
      metaResult?.error?.error_subcode === 2388093
    ) {
      const retryName = `${name}_v${Date.now().toString(36).slice(-4)}`;
      metaPayload.name = retryName;

      metaResponse = await fetch(`${GRAPH_API}/${waba_id}/message_templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      });
      metaResult = await metaResponse.json();

      if (!metaResponse.ok) {
        return new Response(JSON.stringify({ error: metaErrorMessage(metaResult, "Erro ao submeter template (retry)") }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!metaResponse.ok) {
      console.error("Meta recusou o template:", JSON.stringify(metaResult));
      return new Response(JSON.stringify({ error: metaErrorMessage(metaResult, "Erro ao submeter template à Meta") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const returnedMetaId = metaResult.id || metaTemplateId;

    // Save / update in meta_templates table
    if (isEdit && templateId) {
      await supabase
        .from("meta_templates")
        .update({
          name: metaPayload.name || name,
          category,
          language,
          components,
          samples,
          labels,
          validation_score,
          meta_template_id: returnedMetaId,
          meta_connection_id: metaConnectionId,
          status: metaResult.status || "PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);
    } else {
      await supabase.from("meta_templates").insert({
        name: metaPayload.name || name,
        category,
        language,
        components,
        samples,
        labels,
        validation_score,
        meta_template_id: returnedMetaId,
        meta_connection_id: metaConnectionId,
        status: metaResult.status || "PENDING",
      });
    }

    return new Response(
      JSON.stringify({ success: true, metaTemplateId: returnedMetaId, status: metaResult.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("submit-template error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// A Meta manda um texto genérico em "message" e o motivo real em "error_user_title"/"error_user_msg"
function metaErrorMessage(metaResult: any, fallback: string): string {
  const e = metaResult?.error;
  if (!e) return fallback;
  const detail = [e.error_user_title, e.error_user_msg].filter(Boolean).join(": ");
  return detail || e.message || fallback;
}

async function uploadMediaToMeta(
  mediaUrl: string,
  format: string,
  accessToken: string,
  _wabaId: string
): Promise<string> {
  // Baixa o arquivo que foi enviado no cabeçalho
  const fileResponse = await fetch(mediaUrl);
  if (!fileResponse.ok) {
    throw new Error(`Não foi possível baixar o arquivo do cabeçalho (HTTP ${fileResponse.status})`);
  }
  const fileBlob = await fileResponse.blob();

  const fallbackMime: Record<string, string> = {
    IMAGE: "image/jpeg",
    VIDEO: "video/mp4",
    DOCUMENT: "application/pdf",
  };
  // Usa o tipo real do arquivo (JPG, PNG...) em vez de assumir sempre PNG
  const mime = (fileBlob.type || fileResponse.headers.get("content-type") || fallbackMime[format] || "application/octet-stream")
    .split(";")[0].trim();
  const fileName = decodeURIComponent(new URL(mediaUrl).pathname.split("/").pop() || "arquivo");

  // A sessão de upload da Meta precisa ser aberta no ID do App (não no ID da conta WhatsApp)
  const appRes = await fetch(`${GRAPH_API}/app`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const appData = await appRes.json();
  if (!appData?.id) {
    throw new Error(`Falha ao identificar o App da Meta: ${metaErrorMessage(appData, "token sem App associado")}`);
  }

  const sessionParams = new URLSearchParams({
    file_name: fileName,
    file_length: String(fileBlob.size),
    file_type: mime,
  });
  const sessionRes = await fetch(`${GRAPH_API}/${appData.id}/uploads?${sessionParams}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const sessionData = await sessionRes.json();

  if (!sessionData.id) {
    console.error("Meta upload session:", JSON.stringify(sessionData));
    throw new Error(`Falha ao criar sessão de upload na Meta: ${metaErrorMessage(sessionData, "sem detalhes")}`);
  }

  // Envia o arquivo
  const uploadRes = await fetch(`${GRAPH_API}/${sessionData.id}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      file_offset: "0",
    },
    body: fileBlob,
  });
  const uploadData = await uploadRes.json();

  if (!uploadData.h) {
    console.error("Meta upload:", JSON.stringify(uploadData));
    throw new Error(`Falha ao fazer upload do arquivo na Meta: ${metaErrorMessage(uploadData, "sem detalhes")}`);
  }

  return uploadData.h;
}
