import { useState } from "react";
import { callClaude } from "../api/claude";
import { parseReply } from "../utils/parser";
import { SYSTEM_DOCS, SYSTEM_NO_DOCS } from "../constants/prompts";

export function useChat({ hasSupporting }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [streamText, setStreamText] = useState("");

  const initMessages = (msgs) => setMessages(msgs);

  const send = async () => {
    if (!input.trim() || loading) return null;

    const userMsg = { role: "user", content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    setStreamText("");

    try {
      // Claude's API requires message content to be a string in multi-turn history.
      // The first assistant turn holds a content array (document objects); flatten it.
      const apiMsgs = history.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "Documents uploaded + initial request",
      }));

      const reply = await callClaude(
        apiMsgs,
        hasSupporting ? SYSTEM_DOCS : SYSTEM_NO_DOCS,
        (chunk) => setStreamText(chunk),
      );
      setStreamText("");

      const parsed = parseReply(reply);
      const assistantContent =
        parsed.html?.length > 300 ? "✅ Form 130 ready! See all 3 pages below." : parsed.clean;

      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
      return parsed;
    } finally {
      setLoading(false);
    }
  };

  return { messages, input, setInput, loading, streamText, initMessages, send };
}
