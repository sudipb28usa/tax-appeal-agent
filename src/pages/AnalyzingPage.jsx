import { ProgressBar } from "../components/ProgressBar";

export function AnalyzingPage({ progress, progressLabel, detectedCounty, files, hasSupporting }) {
  const checkItems = [
    { icon: "📋", label: "Appeal Form (Form 130)",                                         done: progress >= 25 },
    { icon: "📄", label: "Assessment Notice (Form 11)",                                    done: progress >= 42 },
    ...(hasSupporting
      ? [{ icon: "📎", label: `Supporting: ${files["supporting"]?.name}`,                 done: progress >= 60 }]
      : [
          { icon: "🌍", label: "Detecting state & county",                                 done: progress >= 56 },
          { icon: "🔍", label: `Researching ${detectedCounty || "your county"}'s appeal process`, done: progress >= 72 },
          { icon: "📋", label: "Looking up deadlines, statutes & offices",                 done: progress >= 85 },
        ]),
    { icon: "✍️", label: "Building personalized roadmap & form",                           done: progress >= 95 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0a0f1e,#0f172a,#110a2a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>{hasSupporting ? "📊" : "🔍"}</div>
        <h2 style={{ color: "#f8fafc", fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>
          {hasSupporting ? "Analyzing Your Documents" : "Detecting Jurisdiction & Researching Process"}
        </h2>
        <p style={{ color: "#475569", fontSize: 13, margin: "0 0 28px" }}>
          {hasSupporting
            ? "Reading Form 130, Assessment Notice & supporting evidence…"
            : "No process doc — finding your county, researching local appeal rules…"}
        </p>
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 22 }}>
          <ProgressBar pct={progress} label={progressLabel} />
          <div style={{ display: "flex", flexDirection: "column", gap: 7, textAlign: "left" }}>
            {checkItems.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: item.done ? "#065f46" : "#1e293b", border: `1.5px solid ${item.done ? "#34d399" : "#334155"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, transition: "all .5s" }}>
                  {item.done ? "✓" : item.icon}
                </div>
                <span style={{ fontSize: 12, color: item.done ? "#34d399" : "#475569", transition: "color .5s" }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
