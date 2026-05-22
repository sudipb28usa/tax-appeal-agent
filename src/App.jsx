import { useState, useRef, useCallback } from "react";

// ─── API call through secure Vercel proxy ─────────────────────────────────
// The proxy at /api/chat holds your ANTHROPIC_API_KEY server-side.
// The browser never sees the key.
async function callClaude(messages, systemPrompt, onChunk) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      stream: true,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split("\n")) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (d === "[DONE]") break;
      try {
        const j = JSON.parse(d);
        if (j.type === "content_block_delta" && j.delta?.text) {
          full += j.delta.text;
          onChunk(full);
        }
      } catch {}
    }
  }
  return full;
}

// ─── File helpers ──────────────────────────────────────────────────────────
const readB64 = (f) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

// ─── Extract helpers ───────────────────────────────────────────────────────
function extractTag(text, tag) {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}
function extractHTML(text) {
  return text
    .replace(/<FORM_DATA>[\s\S]*?<\/FORM_DATA>/g, "")
    .replace(/<NEXT_ACTIONS>[\s\S]*?<\/NEXT_ACTIONS>/g, "")
    .replace(/<PROCESS_INFO>[\s\S]*?<\/PROCESS_INFO>/g, "")
    .replace(/```html?/gi, "")
    .replace(/```/g, "")
    .trim();
}

// ─── System prompts ────────────────────────────────────────────────────────
const SYSTEM_DOCS = `You are a property tax appeal specialist. Help homeowners fill out their appeal form.

WORKFLOW:
1. Read ALL uploaded documents (Appeal Form, Assessment Notice, supporting docs).
2. Extract every field automatically. Analyze supporting docs for evidence.
3. Ask ONLY for missing required fields. Group questions logically.
4. Output the filled form when ready.

OUTPUT FORMAT (when ready):
<FORM_DATA>{json}</FORM_DATA>
<NEXT_ACTIONS>[array]</NEXT_ACTIONS>
Then full 3-page HTML Form 130.

FORM_DATA fields:
{"county":"","township":"","state":"","parcel":"","property_address":"","legal_description":"",
"owner_name":"","phone":"","mailing_address":"","email":"",
"current_land":"","current_improvements":"","current_total":"",
"requested_land":"","requested_improvements":"","requested_total":"",
"assessment_year":"","damages":[],"zillow_url":"","date":"",
"deadline":"","assessor_name":"","assessor_address":"","assessor_phone":"",
"burden_of_proof":true,"supporting_docs_summary":"","has_supporting_docs":true}

NEXT_ACTIONS: array of {step,status("done|current|upcoming"),icon,title,description,deadline,tip}
Steps: 1=File Form(current), 2=Informal Meeting, 3=Gather Evidence(mention docs), 4=Board Hearing, 5=State Board Appeal, 6=Tax Court

FORM HTML rules:
- Exact Form 130 structure, 3 pages, inline styles only
- border:1px solid #999; border-collapse:collapse; width:100%
- Section headers: background:#e8e8e8; font-weight:bold; text-align:center; padding:6px
- Cell labels: font-size:10px; color:#555; font-style:italic; padding:3px 8px 1px
- Cell values: font-size:12px; font-weight:500; color:#000; padding:2px 8px 6px
- Reasons text box: font-size:8.5pt; line-height:1.45; fit ALL damage points (1-2 lines each)
- Use persuasive language: mention material defect, mandatory disclosure where applicable
- Page breaks: <div style="page-break-after:always;margin-bottom:40px"></div>`;

const SYSTEM_NO_DOCS = `You are a property tax appeal specialist. Help homeowners complete their property tax appeal.

No process documents uploaded. Your job:
1. Extract state and county from the uploaded Assessment Notice and Appeal Form.
2. Research the full appeal process for that specific state/county from your knowledge.
3. Build a hyper-specific step-by-step appeal roadmap for that jurisdiction.
4. Fill out the appeal form completely.

JURISDICTION RESEARCH — provide for the identified state/county:
- Official appeal form name/number
- Exact filing deadline statute
- Assessor office: name, address, phone, website
- Informal meeting process
- Board of review/appeals: name, composition, hearing timeline
- State appeals board: name, deadline to file, hearing timeline
- Tax court filing deadline
- Burden-of-proof threshold (e.g. >5% increase shifts burden)
- Local tips specific to that county

OUTPUT FORMAT (when ready):
<FORM_DATA>{json with same fields as above plus has_supporting_docs:false}</FORM_DATA>
<PROCESS_INFO>{
  "state":"","county":"",
  "jurisdiction_summary":"2-3 sentence overview",
  "filing_office":{"name":"","address":"","phone":"","website":""},
  "key_statute":"","deadline_rule":"","burden_of_proof_rule":"",
  "board_name":"","board_timeline":"",
  "state_board_name":"","state_board_timeline":"",
  "local_tips":[]
}</PROCESS_INFO>
<NEXT_ACTIONS>[array of {step,status,icon,title,description,deadline,tip,statute,office_name,office_phone}]</NEXT_ACTIONS>
Then full HTML appeal form (3 pages, exact Form 130 layout if Indiana, equivalent for other states).

NEXT_ACTIONS must use real office names, real statutes, real deadlines for that specific county.
FORM HTML same rules as above.`;

// ─── STEP DEFINITIONS ─────────────────────────────────────────────────────
const STEPS = [
  { id: "appeal",     label: "Appeal Form (Form 130)",         icon: "📋", accept: "image/*,application/pdf", required: true  },
  { id: "notice",     label: "Assessment Notice (Form 11)",    icon: "📄", accept: "image/*,application/pdf", required: true  },
  { id: "supporting", label: "Supporting / Process Documents", icon: "📎", accept: "image/*,application/pdf", required: false },
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────

function DropZone({ step, file, onChange, unlocked }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handle = (f) => { if (f && unlocked) onChange(step.id, f); };

  return (
    <div
      onClick={() => unlocked && ref.current.click()}
      onDragOver={(e) => { e.preventDefault(); if (unlocked) setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      style={{
        border: `2px dashed ${!unlocked ? "#2d3748" : drag ? "#60a5fa" : file ? "#34d399" : "#4b5563"}`,
        borderRadius: 12, padding: "15px 14px", cursor: unlocked ? "pointer" : "default",
        background: !unlocked ? "rgba(0,0,0,.2)" : drag ? "rgba(96,165,250,.08)" : file ? "rgba(52,211,153,.07)" : "rgba(255,255,255,.03)",
        transition: "all .25s", opacity: unlocked ? 1 : 0.45,
      }}
    >
      <input ref={ref} type="file" accept={step.accept} style={{ display: "none" }} onChange={(e) => handle(e.target.files[0])} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 24, flexShrink: 0 }}>{file ? "✅" : step.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: file ? "#34d399" : unlocked ? "#f1f5f9" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file ? file.name : step.label}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {!unlocked ? "🔒 Upload previous document first" : file ? "Uploaded · click to replace" : step.required ? "Required" : "Optional · drag or click"}
          </div>
        </div>
        <div style={{ background: step.required && !file && unlocked ? "#dc2626" : "#374151", color: step.required && !file && unlocked ? "#fff" : "#9ca3af", fontSize: 10, padding: "2px 7px", borderRadius: 99, flexShrink: 0 }}>
          {step.required ? (file ? "✓" : "Required") : (file ? "✓" : "Optional")}
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, content, streaming }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14, alignItems: "flex-end", gap: 8 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#1e40af,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>⚖</div>
      )}
      <div style={{ maxWidth: "76%", padding: "10px 14px", borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px", background: isUser ? "linear-gradient(135deg,#1e40af,#3b82f6)" : "#1e293b", color: "#f1f5f9", fontSize: 13, lineHeight: 1.65, boxShadow: "0 2px 8px rgba(0,0,0,.3)" }}>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
          {content}{streaming && <span style={{ opacity: 0.4 }}>▋</span>}
        </pre>
      </div>
    </div>
  );
}

function ProgressBar({ pct, label }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 12, color: "#60a5fa" }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: 99, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

function JurisdictionCard({ info }) {
  if (!info) return null;
  return (
    <div style={{ background: "rgba(96,165,250,.07)", border: "1px solid #3b82f644", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>🔍</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#60a5fa" }}>{info.county} County, {info.state} — Appeal Process</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Researched for your jurisdiction</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 10 }}>{info.jurisdiction_summary}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { icon: "📋", label: "Key Statute", val: info.key_statute },
          { icon: "⏰", label: "Deadline Rule", val: info.deadline_rule },
          { icon: "⚖️", label: "Board of Review", val: info.board_name },
          { icon: "📊", label: "Board Timeline", val: info.board_timeline },
          { icon: "🏛️", label: "State Board", val: info.state_board_name },
          { icon: "⚡", label: "Burden of Proof", val: info.burden_of_proof_rule },
        ].filter((i) => i.val).map((item, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "7px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{item.icon} {item.label}</div>
            <div style={{ fontSize: 11, color: "#e2e8f0", lineHeight: 1.4 }}>{item.val}</div>
          </div>
        ))}
      </div>
      {info.filing_office && (
        <div style={{ marginTop: 10, background: "rgba(52,211,153,.07)", border: "1px solid #34d39933", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 11, color: "#34d399", fontWeight: 600, marginBottom: 4 }}>📍 Where to File</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>{info.filing_office.name}</div>
          {info.filing_office.address && <div style={{ fontSize: 11, color: "#94a3b8" }}>{info.filing_office.address}</div>}
          {info.filing_office.phone && <div style={{ fontSize: 11, color: "#94a3b8" }}>📞 {info.filing_office.phone}</div>}
          {info.filing_office.website && <a href={info.filing_office.website} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#60a5fa", display: "block" }}>🌐 {info.filing_office.website}</a>}
        </div>
      )}
      {info.local_tips && info.local_tips.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600, marginBottom: 5 }}>💡 Local Tips</div>
          {info.local_tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d97706", padding: "3px 0 3px 14px", borderLeft: "2px solid #fbbf2444", marginBottom: 2 }}>{tip}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function NextActions({ actions, compact = false }) {
  const sC = { done: "#34d399", current: "#60a5fa", upcoming: "#475569" };
  const sB = { done: "rgba(52,211,153,.08)", current: "rgba(96,165,250,.1)", upcoming: "rgba(255,255,255,.02)" };

  return (
    <div style={{ margin: compact ? 0 : "20px 0" }}>
      {!compact && (
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>
          📋 YOUR APPEAL ROADMAP
        </div>
      )}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: compact ? 15 : 19, top: 30, bottom: 30, width: 2, background: "linear-gradient(180deg,#34d399 0%,#60a5fa 30%,#334155 60%)", borderRadius: 2, zIndex: 0 }} />
        {actions.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: compact ? 10 : 14, marginBottom: compact ? 8 : 10, position: "relative", zIndex: 1 }}>
            <div style={{ width: compact ? 30 : 38, height: compact ? 30 : 38, borderRadius: "50%", flexShrink: 0, background: sB[a.status], border: `2px solid ${sC[a.status]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: compact ? 12 : 15, boxShadow: a.status === "current" ? `0 0 14px ${sC[a.status]}55` : "none" }}>
              {a.status === "done" ? "✓" : a.icon}
            </div>
            <div style={{ flex: 1, padding: compact ? "6px 10px" : "8px 14px", borderRadius: 10, background: sB[a.status], border: `1px solid ${a.status === "current" ? "#60a5fa33" : "#ffffff08"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, fontSize: compact ? 11 : 13, color: a.status === "upcoming" ? "#64748b" : "#f1f5f9" }}>{a.title}</span>
                {a.status === "current" && <span style={{ background: "#1d4ed8", color: "#fff", fontSize: 9, padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>NOW</span>}
                {a.status === "done" && <span style={{ background: "#064e3b", color: "#34d399", fontSize: 9, padding: "1px 7px", borderRadius: 99 }}>DONE</span>}
                {a.deadline && <span style={{ background: "#7c2d12", color: "#fb923c", fontSize: 9, padding: "1px 7px", borderRadius: 99, marginLeft: "auto" }}>⏰ {a.deadline}</span>}
              </div>
              <div style={{ fontSize: compact ? 10 : 11, color: a.status === "upcoming" ? "#475569" : "#94a3b8", lineHeight: 1.55 }}>{a.description}</div>
              {a.office_name && <div style={{ fontSize: 10, color: "#34d399", marginTop: 4 }}>📍 {a.office_name}{a.office_phone ? ` — ${a.office_phone}` : ""}</div>}
              {a.statute && <div style={{ fontSize: 10, color: "#7dd3fc", marginTop: 2 }}>§ {a.statute}</div>}
              {a.tip && <div style={{ marginTop: 5, fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,.07)", padding: "3px 8px", borderRadius: 6, borderLeft: "2px solid #fbbf24" }}>💡 {a.tip}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("upload");
  const [files, setFiles] = useState({});
  const [zillow, setZillow] = useState("");
  const [damages, setDamages] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [formHTML, setFormHTML] = useState("");
  const [formData, setFormData] = useState(null);
  const [nextActions, setNextActions] = useState(null);
  const [processInfo, setProcessInfo] = useState(null);
  const [supportingSummary, setSupportingSummary] = useState("");
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeLabel, setAnalyzeLabel] = useState("");
  const [detectedCounty, setDetectedCounty] = useState("");
  const [error, setError] = useState("");
  const chatEndRef = useRef();
  const timerRef = useRef();

  const handleFile = (id, f) => setFiles((p) => ({ ...p, [id]: f }));
  const canStart = files["appeal"] && files["notice"];
  const hasSupporting = !!files["supporting"];

  const buildContent = useCallback(async () => {
    const content = [];
    for (const s of STEPS) {
      const f = files[s.id];
      if (!f) continue;
      const b64 = await readB64(f);
      const isImg = f.type.startsWith("image/");
      if (isImg) {
        content.push({ type: "image", source: { type: "base64", media_type: f.type, data: b64 } });
      } else {
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } });
      }
      content.push({ type: "text", text: `[Above file is: ${s.label}]` });
    }
    content.push({
      type: "text",
      text: `Zillow URL: ${zillow || "Not provided"}
House damages:
${damages || "None provided yet"}
Supporting process documents uploaded: ${hasSupporting ? "YES — analyze for evidence" : "NO — research this jurisdiction's appeal process from your knowledge"}
Please extract all fields, ${hasSupporting ? "analyze supporting docs" : "research the full jurisdiction-specific appeal process"}, then generate the complete filled form.`,
    });
    return content;
  }, [files, zillow, damages, hasSupporting]);

  const startProgress = (stages) => {
    let i = 0;
    setAnalyzeProgress(stages[0].pct);
    setAnalyzeLabel(stages[0].label);
    timerRef.current = setInterval(() => {
      i++;
      if (i < stages.length) {
        setAnalyzeProgress(stages[i].pct);
        setAnalyzeLabel(stages[i].label);
      } else clearInterval(timerRef.current);
    }, 950);
  };

  const processReply = (reply) => {
    const fd = extractTag(reply, "FORM_DATA");
    const na = extractTag(reply, "NEXT_ACTIONS");
    const pi = extractTag(reply, "PROCESS_INFO");
    const html = extractHTML(reply);
    if (fd) {
      setFormData(fd);
      if (fd.county) setDetectedCounty(fd.county);
      if (fd.supporting_docs_summary) setSupportingSummary(fd.supporting_docs_summary);
    }
    if (na) setNextActions(na);
    if (pi) setProcessInfo(pi);
    return { fd, na, pi, html };
  };

  const startAgent = async () => {
    setError("");
    setPhase("analyzing");

    const stages = hasSupporting
      ? [
          { label: "Reading Appeal Form…", pct: 15 },
          { label: "Reading Assessment Notice…", pct: 32 },
          { label: "Analyzing supporting documents…", pct: 52 },
          { label: "Extracting evidence…", pct: 68 },
          { label: "Cross-referencing documents…", pct: 82 },
          { label: "Building roadmap…", pct: 93 },
        ]
      : [
          { label: "Reading Appeal Form…", pct: 15 },
          { label: "Reading Assessment Notice…", pct: 32 },
          { label: "Detecting state & county…", pct: 48 },
          { label: "Researching county appeal process…", pct: 65 },
          { label: "Looking up statutes & deadlines…", pct: 80 },
          { label: "Building personalized roadmap…", pct: 93 },
        ];
    startProgress(stages);

    try {
      const content = await buildContent();
      const systemPrompt = hasSupporting ? SYSTEM_DOCS : SYSTEM_NO_DOCS;
      const reply = await callClaude([{ role: "user", content }], systemPrompt, () => {});

      clearInterval(timerRef.current);
      setAnalyzeProgress(100);
      setAnalyzeLabel("Complete!");
      await new Promise((r) => setTimeout(r, 350));

      const { html } = processReply(reply);
      const userMsg = { role: "user", content: "📎 Documents analyzed." };

      if (html && html.length > 300) {
        setFormHTML(html);
        setMessages([userMsg, { role: "assistant", content: "✅ All information extracted. Your Form 130 and personalized appeal roadmap are ready below." }]);
        setPhase("form");
      } else {
        const clean = reply
          .replace(/<FORM_DATA>[\s\S]*?<\/FORM_DATA>/g, "")
          .replace(/<NEXT_ACTIONS>[\s\S]*?<\/NEXT_ACTIONS>/g, "")
          .replace(/<PROCESS_INFO>[\s\S]*?<\/PROCESS_INFO>/g, "")
          .trim();
        setMessages([userMsg, { role: "assistant", content: clean }]);
        setPhase("chat");
      }
    } catch (e) {
      clearInterval(timerRef.current);
      setError(e.message);
      setPhase("upload");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    setStreamText("");

    try {
      const apiMsgs = newMsgs.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "Documents uploaded + initial request",
      }));
      const reply = await callClaude(apiMsgs, hasSupporting ? SYSTEM_DOCS : SYSTEM_NO_DOCS, (t) => setStreamText(t));
      setStreamText("");
      const { html } = processReply(reply);

      if (html && html.length > 300) {
        setFormHTML(html);
        setMessages((p) => [...p, { role: "assistant", content: "✅ Form 130 ready! See all 3 pages below." }]);
        setPhase("form");
      } else {
        const clean = reply
          .replace(/<FORM_DATA>[\s\S]*?<\/FORM_DATA>/g, "")
          .replace(/<NEXT_ACTIONS>[\s\S]*?<\/NEXT_ACTIONS>/g, "")
          .replace(/<PROCESS_INFO>[\s\S]*?<\/PROCESS_INFO>/g, "")
          .trim();
        setMessages((p) => [...p, { role: "assistant", content: clean }]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const resetAll = () => {
    clearInterval(timerRef.current);
    setPhase("upload"); setFiles({}); setZillow(""); setDamages("");
    setMessages([]); setInput(""); setFormHTML(""); setFormData(null);
    setNextActions(null); setProcessInfo(null); setSupportingSummary("");
    setDetectedCounty(""); setError(""); setAnalyzeProgress(0);
  };

  // ══════════════════════ UPLOAD ══════════════════════
  if (phase === "upload") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0a0f1e 0%,#0f172a 50%,#110a2a 100%)", padding: "28px 16px", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>⚖️</div>
          <h1 style={{ color: "#f8fafc", fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Property Tax Appeal Agent</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
            Upload documents → Agent reads &amp; researches your county → Fills form + full appeal roadmap
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>Step 1 — Upload Documents</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STEPS.map((s) => {
              const unlocked = s.id === "appeal" ? true : s.id === "notice" ? !!files["appeal"] : true;
              return <DropZone key={s.id} step={s} file={files[s.id]} onChange={handleFile} unlocked={unlocked} />;
            })}
          </div>
          {canStart && (
            <div style={{ marginTop: 10, padding: "9px 12px", background: hasSupporting ? "rgba(52,211,153,.07)" : "rgba(96,165,250,.07)", border: `1px solid ${hasSupporting ? "#34d39933" : "#3b82f633"}`, borderRadius: 8, fontSize: 12, color: hasSupporting ? "#6ee7b7" : "#93c5fd" }}>
              {hasSupporting
                ? "✨ Process document uploaded — agent will extract procedural steps from your document."
                : "🔍 No process doc — agent will auto-detect your county & research its full appeal procedure."}
            </div>
          )}
        </div>

        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>
            Step 2 — Zillow Link <span style={{ color: "#334155", fontWeight: 400, textTransform: "none" }}>(optional)</span>
          </div>
          <input value={zillow} onChange={(e) => setZillow(e.target.value)} placeholder="https://www.zillow.com/homedetails/..."
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #1e293b", background: "#0f172a", color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20, marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>Step 3 — House Damages</div>
          <textarea value={damages} onChange={(e) => setDamages(e.target.value)} rows={5}
            placeholder={"1. Master bathroom ceiling crack\n2. Primary shower hole in wall\n3. Guest bath active water leak & ceiling stain\n4. Exterior chimney misalignment\n5. Exterior paint & woodwork failure\n6. 2nd floor vent bird intrusion & duct damage"}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #1e293b", background: "#0f172a", color: "#f1f5f9", fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>

        {error && (
          <div style={{ background: "#450a0a", color: "#fca5a5", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button onClick={startAgent} disabled={!canStart} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: canStart ? "pointer" : "not-allowed", background: canStart ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : "#1e293b", color: canStart ? "#fff" : "#475569", fontSize: 14, fontWeight: 700, boxShadow: canStart ? "0 4px 28px rgba(124,58,237,.35)" : "none", transition: "all .2s" }}>
          {!canStart ? "Upload Appeal Form + Assessment Notice to begin" : hasSupporting ? "🚀 Analyze Documents + Evidence → Generate Form" : "🔍 Detect County → Research Process → Generate Form"}
        </button>
        <p style={{ color: "#334155", fontSize: 11, textAlign: "center", marginTop: 8 }}>
          Without process docs: agent auto-detects your county &amp; researches the full appeal procedure
        </p>
      </div>
    </div>
  );

  // ══════════════════════ ANALYZING ══════════════════════
  if (phase === "analyzing") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0a0f1e,#0f172a,#110a2a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>{!hasSupporting ? "🔍" : "📊"}</div>
        <h2 style={{ color: "#f8fafc", fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>
          {!hasSupporting ? "Detecting Jurisdiction & Researching Process" : "Analyzing Your Documents"}
        </h2>
        <p style={{ color: "#475569", fontSize: 13, margin: "0 0 28px" }}>
          {!hasSupporting ? "No process doc — finding your county, researching local appeal rules…" : "Reading Form 130, Assessment Notice & supporting evidence…"}
        </p>
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 22 }}>
          <ProgressBar pct={analyzeProgress} label={analyzeLabel} />
          <div style={{ display: "flex", flexDirection: "column", gap: 7, textAlign: "left" }}>
            {[
              { icon: "📋", label: "Appeal Form (Form 130)", done: analyzeProgress >= 25 },
              { icon: "📄", label: "Assessment Notice (Form 11)", done: analyzeProgress >= 42 },
              ...(hasSupporting
                ? [{ icon: "📎", label: `Supporting: ${files["supporting"]?.name}`, done: analyzeProgress >= 60 }]
                : [
                    { icon: "🌍", label: `Detecting state & county`, done: analyzeProgress >= 56 },
                    { icon: "🔍", label: `Researching ${detectedCounty || "your county"}'s appeal process`, done: analyzeProgress >= 72 },
                    { icon: "📋", label: "Looking up deadlines, statutes & offices", done: analyzeProgress >= 85 },
                  ]),
              { icon: "✍️", label: "Building personalized roadmap & form", done: analyzeProgress >= 95 },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: item.done ? "#065f46" : "#1e293b", border: `1.5px solid ${item.done ? "#34d399" : "#334155"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, transition: "all .5s" }}>
                  {item.done ? "✓" : item.icon}
                </div>
                <span style={{ fontSize: 12, color: item.done ? "#34d399" : "#475569", transition: "color .5s" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ══════════════════════ CHAT ══════════════════════
  if (phase === "chat") return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ background: "linear-gradient(90deg,#1e3a8a,#4c1d95)", padding: "11px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 20 }}>⚖️</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Property Tax Appeal Agent</div>
          <div style={{ color: "#a5b4fc", fontSize: 11 }}>{processInfo ? `${processInfo.county} County, ${processInfo.state} — researched` : "Gathering remaining information…"}</div>
        </div>
        <button onClick={resetAll} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#e0e7ff", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11 }}>↩ Restart</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {processInfo && <JurisdictionCard info={processInfo} />}
        {nextActions && <NextActions actions={nextActions} />}
        {messages.map((m, i) => <Bubble key={i} role={m.role} content={typeof m.content === "string" ? m.content : "Documents uploaded."} />)}
        {loading && streamText && <Bubble role="assistant" content={streamText} streaming />}
        {loading && !streamText && (
          <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#1e40af,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>⚖</div>
            <div style={{ background: "#1e293b", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", display: "flex", gap: 5 }}>
              {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#64748b", display: "inline-block", animation: "bounce .8s infinite", animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        {error && <div style={{ background: "#450a0a", color: "#fca5a5", padding: "10px 14px", borderRadius: 8, fontSize: 12, marginTop: 8 }}>{error}</div>}
        <div ref={chatEndRef} />
      </div>
      <div style={{ padding: "10px 14px", background: "#0f172a", borderTop: "1px solid #1e293b", maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder="Answer the agent's question…" disabled={loading}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #1e293b", background: "#0a0f1e", color: "#f1f5f9", fontSize: 13, outline: "none" }} />
          <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Send →</button>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  );

  // ══════════════════════ FORM ══════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ background: "linear-gradient(90deg,#1e3a8a,#4c1d95)", padding: "11px 18px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 16px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize: 20 }}>✅</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Form 130 — Complete</div>
          <div style={{ color: "#a5b4fc", fontSize: 11 }}>{processInfo ? `${processInfo.county} County, ${processInfo.state} — full process researched` : "All 3 pages filled · Review and print"}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => window.print()} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#e0e7ff", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11 }}>🖨 Print</button>
          <button onClick={() => setPhase("chat")} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#e0e7ff", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11 }}>💬 Chat</button>
          <button onClick={resetAll} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#e0e7ff", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11 }}>↩ Restart</button>
        </div>
      </div>

      {formData && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 20px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "Current",   val: formData.current_total   || "–", color: "#dc2626" },
            { label: "Requested", val: formData.requested_total || "–", color: "#16a34a" },
            { label: "Reduction", val: formData.current_total && formData.requested_total
                ? `−$${((parseInt(formData.current_total.replace(/\D/g,""))||0)-(parseInt(formData.requested_total.replace(/\D/g,""))||0)).toLocaleString()}` : "–", color: "#2563eb" },
            { label: "Deadline",  val: formData.deadline || "–", color: "#d97706" },
            ...(processInfo ? [{ label: "Jurisdiction", val: `${processInfo.county} Co., ${processInfo.state}`, color: "#7c3aed" }] : []),
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
              <div style={{ fontWeight: 700, color: s.color, fontSize: 16 }}>{s.val}</div>
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

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 40px", display: "grid", gridTemplateColumns: (nextActions || processInfo) ? "1fr 310px" : "1fr", gap: 20, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 2px 20px rgba(0,0,0,.08)", border: "1px solid #e2e8f0", overflow: "auto" }}>
          {formHTML
            ? <div style={{ fontFamily: "Georgia,serif", fontSize: 13 }} dangerouslySetInnerHTML={{ __html: formHTML }} />
            : <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Generating form…</div>}
        </div>

        {(nextActions || processInfo) && (
          <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, border: "1px solid #1e293b", position: "sticky", top: 62, maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}>
            {!hasSupporting && processInfo && (
              <div style={{ background: "rgba(96,165,250,.08)", border: "1px solid #3b82f633", borderRadius: 8, padding: "7px 10px", marginBottom: 12, fontSize: 11, color: "#93c5fd" }}>
                🔍 Process auto-researched — no doc uploaded
              </div>
            )}
            {processInfo && <JurisdictionCard info={processInfo} />}
            {nextActions && <NextActions actions={nextActions} compact />}
            {supportingSummary && (
              <div style={{ marginTop: 12, background: "rgba(52,211,153,.07)", border: "1px solid #34d39933", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#34d399", marginBottom: 5 }}>📎 Evidence Analyzed</div>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{supportingSummary}</div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@media print{button{display:none!important}body{background:white!important}}`}</style>
    </div>
  );
}
