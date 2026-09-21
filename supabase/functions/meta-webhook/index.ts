import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── GET: Meta Webhook Verification ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // O token de verificação fica salvo na tabela app_settings (aparece na tela Canais de WhatsApp)
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: setting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "meta_webhook_verify_token")
      .maybeSingle();
    const verifyToken = setting?.value || Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[meta-webhook] Verification successful");
      return new Response(challenge || "", { status: 200 });
    }

    console.log(`[meta-webhook] Verification failed. mode=${mode}, token_match=${token === verifyToken}`);
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: Process incoming messages ──
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    console.log(`[meta-webhook] Received event: ${JSON.stringify(body).substring(0, 500)}`);

    // Meta sends: { object: "whatsapp_business_account", entry: [...] }
    if (body.object !== "whatsapp_business_account") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;

        const value = change.value || {};
        const phoneNumberId = value.metadata?.phone_number_id || "";
        const messages = value.messages || [];

        // ── STATUS DAS MENSAGENS ENVIADAS (enviada / entregue / lida / falhou) ──
        for (const st of value.statuses || []) {
          if (!st.id || !st.status) continue;
          const erro = st.errors?.[0];
          await supabase
            .from("conversation_messages")
            .update({
              status: st.status,
              ...(erro ? { error_message: traduzirErroMeta(erro) } : {}),
            })
            .eq("message_id", st.id)
            .eq("direction", "outbound");
        }

        for (const msg of messages) {
          const phone = msg.from; // sender phone (E.164 without +)
          const messageId = msg.id;
          const timestamp = msg.timestamp;

          if (!phone || !messageId) continue;

          // ── DEDUPLICATION ──
          const { data: existing } = await supabase
            .from("webhook_message_dedup")
            .select("message_id")
            .eq("message_id", messageId)
            .maybeSingle();

          if (existing) {
            console.log(`[meta-webhook] Duplicate ${messageId}, skipping`);
            continue;
          }

          const { error: dedupErr } = await supabase
            .from("webhook_message_dedup")
            .insert({ message_id: messageId, phone, flow_id: "00000000-0000-0000-0000-000000000000" });

          if (dedupErr) {
            console.log(`[meta-webhook] Dedup race for ${messageId}, skipping`);
            continue;
          }

          // ── EXTRACT TEXT CONTENT ──
          let textContent = "";
          if (msg.type === "text") {
            textContent = msg.text?.body || "";
          } else if (msg.type === "image") {
            textContent = msg.image?.caption || "";
          } else if (msg.type === "video") {
            textContent = msg.video?.caption || "";
          } else if (msg.type === "document") {
            textContent = msg.document?.caption || "";
          } else if (msg.type === "button") {
            textContent = msg.button?.text || "";
          } else if (msg.type === "interactive") {
            textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
          }

          if (!textContent) {
            const rotulos: Record<string, string> = {
              image: "[Imagem]", video: "[Vídeo]", audio: "[Áudio]", document: "[Documento]",
              sticker: "[Figurinha]", location: "[Localização]", contacts: "[Contato]", reaction: "[Reação]",
            };
            textContent = rotulos[msg.type] || `[${msg.type}]`;
          }

          console.log(`[meta-webhook] Message from ${phone}: "${textContent.substring(0, 80)}" (type: ${msg.type})`);

          // ── FIND CONTACT (cria o contato se ainda não existir) ──
          const phoneVariants = buildPhoneVariants(phone);
          let contactId = await findContactId(supabase, phoneVariants);
          if (!contactId) {
            const perfil = (value.contacts || []).find((c: any) => c.wa_id === phone)?.profile?.name;
            const { data: novo } = await supabase
              .from("contacts")
              .insert({ name: perfil || phone, phone, status: "novo", tags: ["whatsapp"] })
              .select("id")
              .maybeSingle();
            contactId = novo?.id || await findContactId(supabase, phoneVariants);
          }

          // ── PERSIST INBOUND MESSAGE ──
          if (contactId) {
            await supabase.from("conversation_messages").insert({
              contact_id: contactId,
              direction: "inbound",
              content: textContent,
              source: "meta_webhook",
              message_id: messageId,
              message_type: msg.type,
              status: "received",
            });
            console.log(`[meta-webhook] Saved inbound message for contact ${contactId}`);
          }

          // ── RESOLVE INSTANCE (by phone_number_id) ──
          let resolvedInstanceId: string | null = null;
          if (phoneNumberId) {
            const { data: conn } = await supabase
              .from("meta_connections")
              .select("id")
              .eq("phone_number_id", phoneNumberId)
              .eq("is_active", true)
              .limit(1)
              .maybeSingle();

            if (conn) {
              const { data: inst } = await supabase
                .from("whatsapp_instances")
                .select("id")
                .eq("meta_connection_id", conn.id)
                .limit(1)
                .maybeSingle();
              resolvedInstanceId = inst?.id || null;
            }
          }

          // ── CHECK WAITING EXECUTIONS (wait_for_reply) ──
          const resumed = await checkWaitingExecutions(supabase, phoneVariants, textContent, phone);
          if (resumed.length > 0) {
            results.push(...resumed);
            continue; // already handled
          }

          // ── TRIGGER ACTIVE FLOWS ──
          const triggered = await triggerFlows(supabase, phoneVariants, textContent, phone, resolvedInstanceId, contactId);
          results.push(...triggered);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed: results.length, ids: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[meta-webhook] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── HELPERS ──────────────────────────────────────────────────────────

// Explica em português os erros de entrega mais comuns da Meta
function traduzirErroMeta(erro: any): string {
  const codigos: Record<number, string> = {
    131047: "Fora da janela de 24h: o cliente não respondeu nas últimas 24 horas. Use um template.",
    131026: "Número sem WhatsApp ou não pode receber mensagens.",
    131049: "A Meta segurou esta mensagem de marketing para não cansar o cliente.",
    131050: "O cliente bloqueou mensagens de marketing.",
    131051: "Tipo de mensagem não suportado.",
    132000: "Quantidade de variáveis diferente da aprovada no template.",
    132001: "Template não existe ou ainda não foi aprovado.",
  };
  return codigos[erro?.code] || erro?.error_data?.details || erro?.message || erro?.title || "Falha na entrega";
}

function buildPhoneVariants(phone: string): string[] {
  const clean = phone.replace(/\D/g, "");
  const variants = [clean, `+${clean}`];
  // Brazilian phone: handle 9th digit
  if (clean.startsWith("55") && clean.length >= 12) {
    const ddd = clean.substring(2, 4);
    const local = clean.substring(4);
    if (local.length === 8) {
      variants.push(`55${ddd}9${local}`, `+55${ddd}9${local}`);
    } else if (local.length === 9 && local.startsWith("9")) {
      variants.push(`55${ddd}${local.substring(1)}`, `+55${ddd}${local.substring(1)}`);
    }
  }
  return variants;
}

async function findContactId(supabase: any, phoneVariants: string[]): Promise<string | null> {
  for (const pv of phoneVariants) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("phone", pv)
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

async function checkWaitingExecutions(
  supabase: any,
  phoneVariants: string[],
  textContent: string,
  phone: string
): Promise<string[]> {
  const { data: waitingExecs } = await supabase
    .from("flow_executions")
    .select("*")
    .eq("status", "waiting")
    .filter("variables->>_waiting_for", "eq", "reply");

  const matching = (waitingExecs || []).filter((e: any) =>
    phoneVariants.includes(e.variables?.phone)
  );

  if (matching.length === 0) return [];

  console.log(`[meta-webhook] Found ${matching.length} waiting execution(s) for ${phone}`);
  const resumed: string[] = [];

  for (const exec of matching) {
    const vars = (exec.variables as Record<string, any>) || {};
    const defaultNext = vars._default_next || null;
    const { _waiting_for, _waiting_node_id, _timeout_at, _default_next, _timeout_next, ...cleanVars } = vars;

    const newStatus = defaultNext ? "in_progress" : "completed";
    const update: Record<string, any> = {
      status: newStatus,
      current_node_id: defaultNext || exec.current_node_id,
      variables: { ...cleanVars, last_message: textContent },
    };
    if (!defaultNext) update.completed_at = new Date().toISOString();

    await supabase.from("flow_executions").update(update).eq("id", exec.id);

    await supabase.from("flow_execution_logs").insert({
      execution_id: exec.id,
      node_id: _waiting_node_id || exec.current_node_id,
      action: "reply_received",
      result: { phone, message_preview: textContent.substring(0, 100) },
    });

    if (defaultNext) {
      supabase.functions.invoke("flow-executor", {
        body: { execution_id: exec.id },
      }).catch((err: any) => console.error(`[meta-webhook] resume error:`, err));
    }

    resumed.push(exec.id);
  }

  return resumed;
}

async function triggerFlows(
  supabase: any,
  phoneVariants: string[],
  textContent: string,
  phone: string,
  resolvedInstanceId: string | null,
  contactId: string | null
): Promise<string[]> {
  // Campaign-linked flows
  const { data: campaignMatches } = await supabase
    .from("broadcast_recipients")
    .select("campaign_id, phone_number, broadcast_campaigns!inner(id, flow_id, name)")
    .in("phone_number", phoneVariants)
    .not("broadcast_campaigns.flow_id", "is", null);

  const campaignFlowIds = new Set<string>();
  const campaignContext: Record<string, string> = {};
  for (const match of campaignMatches || []) {
    const campaign = (match as any).broadcast_campaigns;
    if (campaign?.flow_id) {
      campaignFlowIds.add(campaign.flow_id);
      campaignContext[campaign.flow_id] = campaign.id;
    }
  }

  // Active flows
  const { data: flows } = await supabase
    .from("flows")
    .select("id, trigger_type, trigger_config")
    .eq("status", "active");

  const allFlowIds = new Set([
    ...(flows || []).map((f: any) => f.id),
    ...campaignFlowIds,
  ]);

  if (allFlowIds.size === 0) return [];

  const { data: triggerNodes } = await supabase
    .from("flow_nodes")
    .select("id, flow_id, config")
    .eq("type", "trigger")
    .in("flow_id", Array.from(allFlowIds));

  const triggered: string[] = [];

  for (const triggerNode of triggerNodes || []) {
    const config = (triggerNode.config as any) || {};
    const triggerType = config.trigger_type || "message_received";

    // Test mode check
    if (config.test_mode && config.test_phone) {
      const testPhone = config.test_phone.replace(/\D/g, "");
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone !== testPhone && !cleanPhone.endsWith(testPhone) && !testPhone.endsWith(cleanPhone)) {
        continue;
      }
    }

    let matches = false;

    if (triggerType === "message_received") {
      const filterKeyword = (config.filter_keyword || "").trim().toLowerCase();
      matches = !filterKeyword || textContent.toLowerCase().includes(filterKeyword);
    } else if (triggerType === "keyword") {
      const keyword = (config.keyword || "").trim().toLowerCase();
      const matchMode = config.match_mode || "contains";
      if (keyword) {
        const lower = textContent.toLowerCase();
        matches = matchMode === "exact" ? lower === keyword
          : matchMode === "starts_with" ? lower.startsWith(keyword)
          : lower.includes(keyword);
      }
    } else if (triggerType === "after_campaign") {
      matches = campaignFlowIds.has(triggerNode.flow_id);
    }

    if (!matches) continue;

    // Check existing active execution
    const { data: existingExec } = await supabase
      .from("flow_executions")
      .select("id, variables")
      .eq("flow_id", triggerNode.flow_id)
      .in("status", ["waiting", "in_progress"]);

    if (existingExec?.some((e: any) => phoneVariants.includes(e.variables?.phone))) continue;

    // Resolve contact if not already resolved
    const cId = contactId || await findContactId(supabase, phoneVariants);

    // Find next node
    const { data: edges } = await supabase
      .from("flow_edges")
      .select("target_node_id")
      .eq("source_node_id", triggerNode.id)
      .eq("flow_id", triggerNode.flow_id);

    const nextNodeId = edges?.[0]?.target_node_id || null;

    const { data: execution, error: execError } = await supabase
      .from("flow_executions")
      .insert({
        flow_id: triggerNode.flow_id,
        contact_id: cId,
        current_node_id: nextNodeId || triggerNode.id,
        status: nextNodeId ? "in_progress" : "waiting",
        variables: {
          phone,
          last_message: textContent,
          instance_id: resolvedInstanceId,
          contact_id: cId,
          triggered_at: new Date().toISOString(),
          ...(campaignContext[triggerNode.flow_id] ? { campaign_id: campaignContext[triggerNode.flow_id] } : {}),
        },
      })
      .select()
      .single();

    if (execError) {
      console.error("[meta-webhook] Execution create error:", execError);
      continue;
    }

    await supabase.from("flow_execution_logs").insert({
      execution_id: execution.id,
      node_id: triggerNode.id,
      action: "trigger_activated",
      result: { trigger_type: triggerType, phone, message_preview: textContent.substring(0, 100) },
    });

    if (nextNodeId) {
      supabase.functions.invoke("flow-executor", {
        body: { execution_id: execution.id },
      }).catch((err: any) => console.error(`[meta-webhook] executor error:`, err));
    }

    triggered.push(execution.id);
    console.log(`[meta-webhook] Flow ${triggerNode.flow_id} triggered, execution ${execution.id}`);
  }

  return triggered;
}
