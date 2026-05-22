import { DropZone } from "../components/DropZone";
import { STEPS } from "../constants/steps";

export function UploadPage({
  files, onFileChange,
  zillow, onZillowChange,
  damages, onDamagesChange,
  canStart, hasSupporting,
  error,
  connTest,
  onSubmit,
}) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0a0f1e 0%,#0f172a 50%,#110a2a 100%)", padding: "28px 16px", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 580, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>⚖️</div>
          <h1 style={{ color: "#f8fafc", fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Property Tax Appeal Agent</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
            Upload documents → Agent reads &amp; researches your county → Fills form + full appeal roadmap
          </p>
        </div>

        {/* ── Step 1: Documents ── */}
        <section style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>
            Step 1 — Upload Documents
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STEPS.map((step) => {
              const unlocked = step.id === "appeal" ? true : step.id === "notice" ? !!files["appeal"] : true;
              return <DropZone key={step.id} step={step} file={files[step.id]} onChange={onFileChange} unlocked={unlocked} />;
            })}
          </div>
          {canStart && (
            <div style={{ marginTop: 10, padding: "9px 12px", background: hasSupporting ? "rgba(52,211,153,.07)" : "rgba(96,165,250,.07)", border: `1px solid ${hasSupporting ? "#34d39933" : "#3b82f633"}`, borderRadius: 8, fontSize: 12, color: hasSupporting ? "#6ee7b7" : "#93c5fd" }}>
              {hasSupporting
                ? "✨ Process document uploaded — agent will extract procedural steps from your document."
                : "🔍 No process doc — agent will auto-detect your county & research its full appeal procedure."}
            </div>
          )}
        </section>

        {/* ── Step 2: Zillow ── */}
        <section style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>
            Step 2 — Zillow Link <span style={{ color: "#334155", fontWeight: 400, textTransform: "none" }}>(optional)</span>
          </div>
          <input
            value={zillow}
            onChange={(e) => onZillowChange(e.target.value)}
            placeholder="https://www.zillow.com/homedetails/..."
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #1e293b", background: "#0f172a", color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </section>

        {/* ── Step 3: Damages ── */}
        <section style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20, marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>
            Step 3 — House Damages
          </div>
          <textarea
            value={damages}
            onChange={(e) => onDamagesChange(e.target.value)}
            rows={5}
            placeholder={"1. Master bathroom ceiling crack\n2. Primary shower hole in wall\n3. Guest bath active water leak & ceiling stain\n4. Exterior chimney misalignment\n5. Exterior paint & woodwork failure\n6. 2nd floor vent bird intrusion & duct damage"}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #1e293b", background: "#0f172a", color: "#f1f5f9", fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </section>

        {/* ── Error ── */}
        {error && (
          <div style={{ background: "#450a0a", color: "#fca5a5", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* ── Connection test ── */}
        <button
          onClick={connTest.run}
          disabled={connTest.status === "testing"}
          style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px solid #1e3a5f", cursor: connTest.status === "testing" ? "wait" : "pointer", background: "transparent", color: connTest.status === "ok" ? "#34d399" : connTest.status === "fail" ? "#f87171" : "#60a5fa", fontSize: 13, fontWeight: 600, marginBottom: 8, transition: "all .2s" }}
        >
          {connTest.status === "testing" ? "⏳ Testing connection…"
            : connTest.status === "ok"   ? "✅ Connection OK — test again"
            : connTest.status === "fail" ? "❌ Test failed — retry"
            :                              "🔌 Test API Connection"}
        </button>
        {connTest.status && connTest.status !== "testing" && (
          <div style={{ background: connTest.status === "ok" ? "rgba(52,211,153,.08)" : "rgba(248,113,113,.08)", border: `1px solid ${connTest.status === "ok" ? "#34d39933" : "#f8717133"}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: connTest.status === "ok" ? "#6ee7b7" : "#fca5a5", marginBottom: 12, wordBreak: "break-word" }}>
            {connTest.status === "ok" ? "✓ " : "✗ "}{connTest.message}
          </div>
        )}

        {/* ── Submit ── */}
        <button
          onClick={onSubmit}
          disabled={!canStart}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: canStart ? "pointer" : "not-allowed", background: canStart ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : "#1e293b", color: canStart ? "#fff" : "#475569", fontSize: 14, fontWeight: 700, boxShadow: canStart ? "0 4px 28px rgba(124,58,237,.35)" : "none", transition: "all .2s" }}
        >
          {!canStart
            ? "Upload Appeal Form + Assessment Notice to begin"
            : hasSupporting
              ? "🚀 Analyze Documents + Evidence → Generate Form"
              : "🔍 Detect County → Research Process → Generate Form"}
        </button>
        <p style={{ color: "#334155", fontSize: 11, textAlign: "center", marginTop: 8 }}>
          Without process docs: agent auto-detects your county &amp; researches the full appeal procedure
        </p>

        {/* ── Footer ── */}
        <p style={{ color: "#1e293b", fontSize: 11, textAlign: "center", marginTop: 28 }}>
          Created by <span style={{ color: "#475569", fontWeight: 600 }}>Sudip Biswas</span>
        </p>
      </div>
    </div>
  );
}
