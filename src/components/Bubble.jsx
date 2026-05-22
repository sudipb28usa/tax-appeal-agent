export function Bubble({ role, content, streaming }) {
  const isUser = role === "user";

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14, alignItems: "flex-end", gap: 8 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#1e40af,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
          ⚖
        </div>
      )}
      <div style={{ maxWidth: "76%", padding: "10px 14px", borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px", background: isUser ? "linear-gradient(135deg,#1e40af,#3b82f6)" : "#1e293b", color: "#f1f5f9", fontSize: 13, lineHeight: 1.65, boxShadow: "0 2px 8px rgba(0,0,0,.3)" }}>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
          {content}
          {streaming && <span style={{ opacity: 0.4 }}>▋</span>}
        </pre>
      </div>
    </div>
  );
}
