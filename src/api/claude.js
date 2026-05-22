const API_MODEL = "claude-sonnet-4-6";
const API_ENDPOINT = "/api/chat";

export async function callClaude(messages, systemPrompt, onChunk) {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: API_MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      stream: true,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split("\n")) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return full;
      try {
        const event = JSON.parse(data);
        if (event.type === "content_block_delta" && event.delta?.text) {
          full += event.delta.text;
          onChunk(full);
        }
      } catch {}
    }
  }

  return full;
}

export async function pingClaude() {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: API_MODEL,
      max_tokens: 16,
      stream: false,
      messages: [{ role: "user", content: "Reply with OK" }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json().catch(() => null);
  return data?.content?.[0]?.text ?? "responded";
}
