import { JurisdictionCard } from "../components/JurisdictionCard";
import { NextActions } from "../components/NextActions";
import { AppealForm } from "../components/AppealForm";

const HEADER_BTN = {
  background: "rgba(255,255,255,.12)", border: "none", color: "#e0e7ff",
  padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11,
};

function parseDollar(str) {
  return parseInt((str ?? "").replace(/\D/g, "")) || 0;
}

export function FormPage({
  formHTML, formData, nextActions, processInfo, supportingSummary, hasSupporting,
  onChat, onReset,
}) {
  // Handle both new field names (new_total_av) and old names (current_total)
  const currentTotalStr  = formData?.new_total_av   || formData?.current_total;
  const requestedTotalStr = formData?.requested_total;

  const savings = currentTotalStr && requestedTotalStr
    ? parseDollar(currentTotalStr) - parseDollar(requestedTotalStr)
    : null;

  const summaryItems = [
    { label: "Current AV",   value: currentTotalStr   || "–", color: "#dc2626" },
    { label: "Requested AV", value: requestedTotalStr || "–", color: "#16a34a" },
    { label: "Reduction",    value: savings != null ? `−$${savings.toLocaleString()}` : "–", color: "#2563eb" },
    { label: "Deadline",     value: formData?.deadline || "–", color: "#d97706" },
    ...(processInfo ? [{ label: "Jurisdiction", value: `${processInfo.county} Co., ${processInfo.state}`, color: "#7c3aed" }] : []),
  ];

  const hasSidebar = !!(nextActions || processInfo);

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ background: "linear-gradient(90deg,#1e3a8a,#4c1d95)", padding: "11px 18px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 16px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize: 20 }}>✅</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Form 130 — Complete</div>
          <div style={{ color: "#a5b4fc", fontSize: 11 }}>
            {processInfo
              ? `${processInfo.county} County, ${processInfo.state} — full process researched`
              : "All 3 pages filled · Review and print"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onChat}  style={HEADER_BTN}>💬 Chat</button>
          <button onClick={onReset} style={HEADER_BTN}>↩ Restart</button>
        </div>
      </header>

      {/* ── Summary bar ── */}
      {formData && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 20px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          {summaryItems.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
              <div style={{ fontWeight: 700, color: s.color, fontSize: 16 }}>{s.value}</div>
            </div>
          ))}
          {formData.burden_of_proof && (
            <div style={{ marginLeft: "auto", background: "#fefce8", border: "1px solid #fde047", borderRadius: 8, padding: "5px 10px", fontSize: 11, color: "#713f12" }}>
              ⚖️ <strong>Assessor bears burden of proof</strong> — assessment rose &gt;5%
            </div>
          )}
          {!hasSupporting && processInfo && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "5px 10px", fontSize: 11, color: "#1e40af" }}>
              🔍 Process researched for <strong>{processInfo.county} County</strong>
            </div>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 40px", display: "grid", gridTemplateColumns: hasSidebar ? "1fr 310px" : "1fr", gap: 20, alignItems: "start" }}>

        {/* Form */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 2px 20px rgba(0,0,0,.08)", border: "1px solid #e2e8f0", overflow: "auto" }}>
          {formData
            ? <AppealForm formData={formData} />
            : formHTML
              ? <div dangerouslySetInnerHTML={{ __html: formHTML }} />
              : <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Generating form…</div>
          }
        </div>

        {/* Sidebar */}
        {hasSidebar && (
          <aside style={{ background: "#0f172a", borderRadius: 12, padding: 16, border: "1px solid #1e293b", position: "sticky", top: 62, maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}>
            {!hasSupporting && processInfo && (
              <div style={{ background: "rgba(96,165,250,.08)", border: "1px solid #3b82f633", borderRadius: 8, padding: "7px 10px", marginBottom: 12, fontSize: 11, color: "#93c5fd" }}>
                🔍 Process auto-researched — no doc uploaded
              </div>
            )}
            {processInfo && <JurisdictionCard info={processInfo} />}
            {nextActions  && <NextActions actions={nextActions} compact />}
            {supportingSummary && (
              <div style={{ marginTop: 12, background: "rgba(52,211,153,.07)", border: "1px solid #34d39933", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#34d399", marginBottom: 5 }}>📎 Evidence Analyzed</div>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{supportingSummary}</div>
              </div>
            )}
          </aside>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="no-print" style={{ textAlign: "center", padding: "12px 0 20px", color: "#94a3b8", fontSize: 11 }}>
        Created by <span style={{ color: "#cbd5e1", fontWeight: 600 }}>Sudip Biswas</span>
      </footer>

      <style>{`@media print{header,aside,.no-print{display:none!important}body{background:white!important}main{display:block!important;padding:0!important}}`}</style>
    </div>
  );
}
