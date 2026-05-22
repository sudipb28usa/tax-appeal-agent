// Convert a small subset of markdown to HTML for assistant messages.
// We only handle what Claude actually produces; no full markdown parser needed.
function renderMarkdown(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^#{3}\s+(.+)$/gm, '<span style="display:block;margin:10px 0 3px;font-weight:700;color:#93c5fd;font-size:12px">$1</span>')
    .replace(/^#{1,2}\s+(.+)$/gm, '<span style="display:block;margin:12px 0 4px;font-weight:700;color:#60a5fa;font-size:13px">$1</span>')
    .replace(/^[-*]\s+(.+)$/gm, '<span style="display:block;padding-left:14px">• $1</span>')
    .replace(/\n/g, "<br>");
}

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
        {isUser ? (
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {content}
          </pre>
        ) : (
          <div
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) + (streaming ? '<span style="opacity:.4">▋</span>' : "") }}
          />
        )}
      </div>
    </div>
  );
}
