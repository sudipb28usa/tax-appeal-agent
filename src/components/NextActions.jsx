const STATUS_STYLE = {
  done:     { color: "#34d399", bg: "rgba(52,211,153,.08)"  },
  current:  { color: "#60a5fa", bg: "rgba(96,165,250,.1)"   },
  upcoming: { color: "#475569", bg: "rgba(255,255,255,.02)" },
};

export function NextActions({ actions, compact = false }) {
  return (
    <div style={{ margin: compact ? 0 : "20px 0" }}>
      {!compact && (
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>
          📋 YOUR APPEAL ROADMAP
        </div>
      )}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: compact ? 15 : 19, top: 30, bottom: 30, width: 2, background: "linear-gradient(180deg,#34d399 0%,#60a5fa 30%,#334155 60%)", borderRadius: 2, zIndex: 0 }} />
        {actions.map((action, i) => {
          const s    = STATUS_STYLE[action.status] ?? STATUS_STYLE.upcoming;
          const size = compact ? 30 : 38;
          return (
            <div key={i} style={{ display: "flex", gap: compact ? 10 : 14, marginBottom: compact ? 8 : 10, position: "relative", zIndex: 1 }}>
              <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: s.bg, border: `2px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: compact ? 12 : 15, boxShadow: action.status === "current" ? `0 0 14px ${s.color}55` : "none" }}>
                {action.status === "done" ? "✓" : action.icon}
              </div>
              <div style={{ flex: 1, padding: compact ? "6px 10px" : "8px 14px", borderRadius: 10, background: s.bg, border: `1px solid ${action.status === "current" ? "#60a5fa33" : "#ffffff08"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: compact ? 11 : 13, color: action.status === "upcoming" ? "#64748b" : "#f1f5f9" }}>
                    {action.title}
                  </span>
                  {action.status === "current" && (
                    <span style={{ background: "#1d4ed8", color: "#fff", fontSize: 9, padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>NOW</span>
                  )}
                  {action.status === "done" && (
                    <span style={{ background: "#064e3b", color: "#34d399", fontSize: 9, padding: "1px 7px", borderRadius: 99 }}>DONE</span>
                  )}
                  {action.deadline && (
                    <span style={{ background: "#7c2d12", color: "#fb923c", fontSize: 9, padding: "1px 7px", borderRadius: 99, marginLeft: "auto" }}>
                      ⏰ {action.deadline}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: compact ? 10 : 11, color: action.status === "upcoming" ? "#475569" : "#94a3b8", lineHeight: 1.55 }}>
                  {action.description}
                </div>
                {action.office_name && (
                  <div style={{ fontSize: 10, color: "#34d399", marginTop: 4 }}>
                    📍 {action.office_name}{action.office_phone ? ` — ${action.office_phone}` : ""}
                  </div>
                )}
                {action.statute && (
                  <div style={{ fontSize: 10, color: "#7dd3fc", marginTop: 2 }}>§ {action.statute}</div>
                )}
                {action.tip && (
                  <div style={{ marginTop: 5, fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,.07)", padding: "3px 8px", borderRadius: 6, borderLeft: "2px solid #fbbf24" }}>
                    💡 {action.tip}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
