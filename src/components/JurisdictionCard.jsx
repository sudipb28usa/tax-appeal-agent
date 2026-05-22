const GRID_ITEMS = [
  { icon: "📋", label: "Key Statute",     field: "key_statute"         },
  { icon: "⏰", label: "Deadline Rule",   field: "deadline_rule"       },
  { icon: "⚖️", label: "Board of Review", field: "board_name"          },
  { icon: "📊", label: "Board Timeline",  field: "board_timeline"      },
  { icon: "🏛️", label: "State Board",     field: "state_board_name"    },
  { icon: "⚡", label: "Burden of Proof", field: "burden_of_proof_rule" },
];

export function JurisdictionCard({ info }) {
  if (!info) return null;

  return (
    <div style={{ background: "rgba(96,165,250,.07)", border: "1px solid #3b82f644", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>🔍</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#60a5fa" }}>
            {info.county} County, {info.state} — Appeal Process
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Researched for your jurisdiction</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 10 }}>
        {info.jurisdiction_summary}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {GRID_ITEMS.filter((item) => info[item.field]).map((item) => (
          <div key={item.field} style={{ background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "7px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{item.icon} {item.label}</div>
            <div style={{ fontSize: 11, color: "#e2e8f0", lineHeight: 1.4 }}>{info[item.field]}</div>
          </div>
        ))}
      </div>

      {info.filing_office && (
        <div style={{ marginTop: 10, background: "rgba(52,211,153,.07)", border: "1px solid #34d39933", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 11, color: "#34d399", fontWeight: 600, marginBottom: 4 }}>📍 Where to File</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>{info.filing_office.name}</div>
          {info.filing_office.address && <div style={{ fontSize: 11, color: "#94a3b8" }}>{info.filing_office.address}</div>}
          {info.filing_office.phone   && <div style={{ fontSize: 11, color: "#94a3b8" }}>📞 {info.filing_office.phone}</div>}
          {info.filing_office.website && (
            <a href={info.filing_office.website} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#60a5fa", display: "block" }}>
              🌐 {info.filing_office.website}
            </a>
          )}
        </div>
      )}

      {info.local_tips?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600, marginBottom: 5 }}>💡 Local Tips</div>
          {info.local_tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d97706", padding: "3px 0 3px 14px", borderLeft: "2px solid #fbbf2444", marginBottom: 2 }}>
              {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
