// api/chat.js
// Vercel Serverless Function — proxies requests to Anthropic API
// Your ANTHROPIC_API_KEY stays on the server, never exposed to the browser

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY not configured. Add it in Vercel Dashboard → Settings → Environment Variables."
    });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    // Without this check, Anthropic error bodies (e.g. invalid model, bad key) are
    // forwarded with HTTP 200 and non-SSE JSON. The frontend's SSE parser finds no
    // "data:" lines, returns an empty string, and the chat opens silently blank.
    if (!upstream.ok) {
      const errText = await upstream.text();
      let errMsg = errText;
      try { errMsg = JSON.parse(errText)?.error?.message || errText; } catch {}
      return res.status(upstream.status).json({ error: errMsg });
    }

    // stream:false is used by the connection-test ping; everything else streams SSE.
    const isStream = req.body?.stream !== false;

    if (!isStream) {
      // Non-streaming: forward JSON response directly
      const json = await upstream.json();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).json(json);
    }

    // Streaming: forward SSE response back
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    res.status(500).json({ error: err.message });
  }
}
