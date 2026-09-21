// Substitui o gateway de IA do Lovable pela API da Anthropic (Claude).
// Recebe o mesmo formato de chamada que era usado com o Lovable (estilo OpenAI)
// e devolve a resposta nesse mesmo formato, para o resto do código não mudar.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function aiFetch(_url: string, init: RequestInit): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
  }

  const req = JSON.parse(typeof init.body === "string" ? init.body : "{}");
  const messages: { role: string; content: string }[] = req.messages || [];
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const chat = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) }));

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("DISPARO_MODELO_IA") || "claude-sonnet-5",
      max_tokens: req.max_tokens || 4096,
      ...(system ? { system } : {}),
      ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
      messages: chat,
    }),
  });

  if (!res.ok) {
    return new Response(await res.text(), { status: res.status });
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  return Response.json({ choices: [{ message: { role: "assistant", content: text } }] });
}
