import { useRef, useCallback } from "react";
import { Bubble } from "../components/Bubble";
import { JurisdictionCard } from "../components/JurisdictionCard";
import { NextActions } from "../components/NextActions";

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#1e40af,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>⚖</div>
      <div style={{ background: "#1e293b", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", display: "flex", gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#64748b", display: "inline-block", animation: "bounce .8s infinite", animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

export function ChatPage({
  messages, input, setInput, loading, streamText,
  processInfo, nextActions, error,
  onSend, onReset,
}) {
  const chatEndRef = useRef();
  const textareaRef = useRef();

  const scrollToBottom = () =>
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

  // Auto-resize textarea as the user types; cap at 140px.
  const handleChange = useCallback((e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [setInput]);

  // Enter = send, Shift+Enter = newline.
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = async () => {
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await onSend();
    scrollToBottom();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ background: "linear-gradient(90deg,#1e3a8a,#4c1d95)", padding: "11px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 20 }}>⚖️</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Property Tax Appeal Agent</div>
          <div style={{ color: "#a5b4fc", fontSize: 11 }}>
            {processInfo ? `${processInfo.county} County, ${processInfo.state} — researched` : "Gathering remaining information…"}
          </div>
        </div>
        <button onClick={onReset} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#e0e7ff", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11 }}>
          ↩ Restart
        </button>
      </header>

      {/* ── Messages ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "16px 14px", maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {processInfo && <JurisdictionCard info={processInfo} />}
        {nextActions  && <NextActions actions={nextActions} />}
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={typeof m.content === "string" ? m.content : "Documents uploaded."} />
        ))}
        {loading && streamText && <Bubble role="assistant" content={streamText} streaming />}
        {loading && !streamText && <TypingIndicator />}
        {error && (
          <div style={{ background: "#450a0a", color: "#fca5a5", padding: "10px 14px", borderRadius: 8, fontSize: 12, marginTop: 8 }}>
            {error}
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* ── Input bar ── */}
      <footer style={{ padding: "10px 14px", background: "#0f172a", borderTop: "1px solid #1e293b", maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={"Answer the agent's question…\n(Shift+Enter for new line)"}
            disabled={loading}
            rows={1}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #1e293b",
                     background: "#0a0f1e", color: "#f1f5f9", fontSize: 13, outline: "none",
                     resize: "none", lineHeight: 1.5, fontFamily: "inherit", overflowY: "hidden" }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Send →
          </button>
        </div>
      </footer>

      <div style={{ textAlign: "center", padding: "4px 0 8px", color: "#1e293b", fontSize: 11 }}>
        Created by <span style={{ color: "#334155", fontWeight: 600 }}>Sudip Biswas</span>
        <span style={{ margin: "0 6px" }}>·</span>
        © {new Date().getFullYear()} Sudip Biswas. All rights reserved.
      </div>

      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}
