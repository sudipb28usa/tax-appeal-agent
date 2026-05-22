// Renders a filled, print-ready property tax appeal form.
// Matches the official government form layout exactly:
// white paper, black grid borders, small italic field labels, 3-page structure.

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(v)  { return v || ""; }

function prevYr(year) {
  const y = parseInt(year);
  return isNaN(y) ? "Prior Year" : String(y - 1);
}

function fmtDollar(v) {
  if (!v && v !== 0) return "";
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^\d]/g, ""));
  return isNaN(n) ? String(v) : "$" + n.toLocaleString();
}

function buildReasons(f) {
  const lines = Array.isArray(f.damages) && f.damages.length
    ? f.damages.map((item, i) => {
        const t = typeof item === "string" ? item
          : (item?.description || item?.damage || JSON.stringify(item));
        return `${i + 1}. ${t}`;
      })
    : [];
  return [
    f.written_reasons || (lines.length ? lines.join("\n\n") : ""),
    f.zillow_url ? `\nComparable sales reference: ${f.zillow_url}` : "",
  ].filter(Boolean).join("\n");
}

// ─── style constants ─────────────────────────────────────────────────────────

const BORDER  = "1px solid #000";
const HDR_BG  = "#d8d8d8";
const LINE_H  = 28; // px — line height for "ruled paper" in written-reasons section

const S = {
  table:   { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  hdr:     { border: BORDER, background: HDR_BG, fontWeight: "bold",
             textAlign: "center", padding: "4px 6px", fontSize: "9pt" },
  cell:    { border: BORDER, verticalAlign: "top", padding: 0 },
  numCell: { border: BORDER, verticalAlign: "top", padding: 0, textAlign: "right" },
  lbl:     { fontSize: "7.5pt", color: "#444", fontStyle: "italic",
             padding: "2px 6px 0", display: "block", lineHeight: 1.2 },
  val:     { fontSize: "10.5pt", fontWeight: 600, color: "#000",
             padding: "1px 6px 4px", display: "block", minHeight: 18 },
};

// ─── atomic cell components ──────────────────────────────────────────────────

function LC({ label, value, colSpan, w, right }) {
  return (
    <td colSpan={colSpan} style={{ ...S.cell, ...(w ? { width: w } : {}), ...(right ? { textAlign: "right" } : {}) }}>
      {label && <span style={S.lbl}>{label}</span>}
      <span style={S.val}>{fmt(value)}</span>
    </td>
  );
}

function NC({ value, w, bold }) {
  return (
    <td style={{ ...S.numCell, ...(w ? { width: w } : {}), ...(bold ? { background: "#f0f8ff" } : {}) }}>
      <span style={{ ...S.val, ...(bold ? { fontWeight: "bold" } : {}) }}>{fmtDollar(value)}</span>
    </td>
  );
}

function SHdr({ children, span = 4, left }) {
  return (
    <tr>
      <td colSpan={span} style={{ ...S.hdr, ...(left ? { textAlign: "left" } : {}) }}>
        {children}
      </td>
    </tr>
  );
}

function PageDivider({ label }) {
  return (
    <div style={{ pageBreakAfter: "always", margin: "28px 0 0" }}
         className="screen-only">
      <div style={{ borderTop: "2px dashed #bbb", display: "flex", alignItems: "center",
                    justifyContent: "center", paddingTop: 6 }}>
        <span style={{ background: "#f1f5f9", padding: "2px 12px", fontSize: 11,
                       color: "#94a3b8", borderRadius: 4 }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── main export ─────────────────────────────────────────────────────────────

export function AppealForm({ formData: d }) {
  const f = d || {};

  const prevLand  = f.previous_land_av         || "";
  const prevImpr  = f.previous_improvements_av || "";
  const prevTotal = f.previous_total_av         || "";
  const currLand  = f.new_land_av              || f.current_land         || "";
  const currImpr  = f.new_improvements_av      || f.current_improvements || "";
  const currTotal = f.new_total_av             || f.current_total        || "";
  const reqLand   = f.requested_land           || "";
  const reqImpr   = f.requested_improvements  || "";
  const reqTotal  = f.requested_total          || "";

  const burden    = f.burden_of_proof || f.burden_shifts_to_assessor;
  const reasons   = buildReasons(f);

  // Derive form title / number from extracted data or fall back to generic
  const formTitle = f.form_name  || "TAXPAYER'S NOTICE TO INITIATE AN APPEAL";
  const formNum   = f.state_form_number ? `State Form ${f.state_form_number}` : "";
  const stateAgency = f.state
    ? `Prescribed by the ${f.state} Department of Local Government Finance`
    : "Prescribed by the Department of Local Government Finance";

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", color: "#000" }}>

      {/* ── Print button (hidden when printing) ── */}
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end",
                                         marginBottom: 14, gap: 8 }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "9px 22px", background: "#1d4ed8", color: "#fff", border: "none",
                   borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: "pointer",
                   boxShadow: "0 2px 10px rgba(29,78,216,.35)", letterSpacing: ".02em" }}>
          🖨&nbsp; Print / Save as PDF
        </button>
      </div>

      {/* ── Paper wrapper ── */}
      <div style={{ background: "#fff", border: "1px solid #bbb",
                    boxShadow: "0 4px 24px rgba(0,0,0,.12)", padding: 0 }}>

        {/* ════════════════════════  PAGE 1  ════════════════════════ */}

        {/* Title header */}
        <table style={{ ...S.table, borderBottom: BORDER }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px 14px", textAlign: "center",
                           borderRight: BORDER, verticalAlign: "middle" }}>
                <div style={{ fontSize: "15pt", fontWeight: "bold", letterSpacing: ".04em",
                              textTransform: "uppercase" }}>
                  {formTitle}
                </div>
                <div style={{ fontSize: "8pt", marginTop: 3, color: "#333" }}>
                  {stateAgency}
                </div>
              </td>
              <td style={{ width: "17%", padding: "6px 10px", verticalAlign: "top",
                           textAlign: "right", fontSize: "8pt", whiteSpace: "nowrap" }}>
                {formNum && <div style={{ fontWeight: "bold" }}>{formNum}</div>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Section 1 — Petition Information ── */}
        <table style={S.table}>
          <tbody>
            <SHdr span={4}>SECTION 1 — PETITION INFORMATION</SHdr>
            <tr>
              <LC label="Name of County"           value={f.county} />
              <LC label="Name of Township"          value={f.township} />
              <LC label="Parcel Number"             value={f.parcel}          w="33%" />
              <LC label="Assessment Date (Year)"    value={f.assessment_year} w="13%" />
            </tr>
            <tr>
              <LC label="Property Address (including any street address of property)"
                  value={f.property_address} colSpan={4} />
            </tr>
            <tr>
              <LC label="Legal Description of Property"
                  value={f.legal_description} colSpan={4} />
            </tr>
            <tr>
              <LC label="Name of Taxpayer / Owner"         value={f.owner_name} colSpan={2} />
              <LC label="Telephone Number of Taxpayer"     value={f.phone}      colSpan={2} />
            </tr>
            <tr>
              <LC label="Mailing Address of Taxpayer (if different from property address)"
                  value={f.mailing_address} colSpan={2} />
              <LC label="E-mail Address of Taxpayer"       value={f.email}      colSpan={2} />
            </tr>
          </tbody>
        </table>

        {/* ── Section 2 — Assessed Values ── */}
        <table style={{ ...S.table, marginTop: 5 }}>
          <tbody>
            <SHdr span={4}>SECTION 2 — NATURE AND EXTENT OF THE APPEAL / ASSESSED VALUES</SHdr>

            {/* Type of property */}
            <tr>
              <td colSpan={4} style={{ ...S.cell, padding: "5px 8px" }}>
                <span style={{ fontSize: "8.5pt" }}>
                  Type of assessment being appealed:&nbsp;&nbsp;
                  <strong>☑ Real Property</strong>
                  &nbsp;&nbsp;&nbsp;☐ Personal Property&nbsp;&nbsp;&nbsp;☐ Both
                </span>
              </td>
            </tr>

            {/* AV column headers */}
            <tr>
              <td style={{ ...S.hdr, width: "28%" }}>Assessment</td>
              <td style={{ ...S.hdr, width: "22%" }}>Land AV ($)</td>
              <td style={{ ...S.hdr, width: "27%" }}>Improvements AV ($)</td>
              <td style={{ ...S.hdr, width: "23%" }}>Total AV ($)</td>
            </tr>

            <tr>
              <td style={S.cell}><span style={S.val}>Previous Year&nbsp;({prevYr(f.assessment_year)})</span></td>
              <NC value={prevLand}  />
              <NC value={prevImpr}  />
              <NC value={prevTotal} />
            </tr>
            <tr>
              <td style={S.cell}><span style={S.val}>New Assessment&nbsp;({fmt(f.assessment_year)})</span></td>
              <NC value={currLand}  />
              <NC value={currImpr}  />
              <NC value={currTotal} />
            </tr>
            <tr>
              <td style={S.cell}><span style={S.val}>Net Change</span></td>
              <td colSpan={2} style={{ ...S.cell, padding: "1px 6px 4px" }}>
                <span style={{ fontSize: "10.5pt", fontWeight: 600 }}>
                  {f.increase_amount
                    ? `Amount: $${Number(f.increase_amount).toLocaleString()}`
                    : ""}
                </span>
              </td>
              <td style={S.numCell}>
                <span style={S.val}>
                  {f.increase_pct ? `${f.increase_pct}%` : ""}
                </span>
              </td>
            </tr>

            {burden && (
              <tr>
                <td colSpan={4} style={{ ...S.cell, background: "#fffde7", padding: "5px 10px" }}>
                  <span style={{ fontSize: "8pt", fontWeight: "bold" }}>
                    NOTICE: Assessment increased more than 5% over the prior year's finally determined
                    value. Per IC 6-1.1-15-20, THE BURDEN OF PROOF IS ON THE ASSESSOR to prove the
                    assessed value is correct. Taxpayer need only show the current value is unreasonable.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Section 3 — Contended Value ── */}
        <table style={{ ...S.table, marginTop: 5 }}>
          <tbody>
            <SHdr span={3}>SECTION 3 — TAXPAYER'S CONTENDED VALUE</SHdr>
            <tr>
              <td style={{ ...S.hdr, width: "33%" }}>Requested Land AV ($)</td>
              <td style={{ ...S.hdr, width: "34%" }}>Requested Improvements AV ($)</td>
              <td style={{ ...S.hdr, width: "33%" }}>Requested Total AV ($)</td>
            </tr>
            <tr>
              <NC value={reqLand} />
              <NC value={reqImpr} />
              <NC value={reqTotal} bold />
            </tr>
          </tbody>
        </table>

        {/* ── Section 4 — Grounds ── */}
        <table style={{ ...S.table, marginTop: 5 }}>
          <tbody>
            <SHdr>SECTION 4 — GROUNDS FOR APPEAL (check all that apply)</SHdr>
            <tr>
              <td style={{ ...S.cell, padding: "7px 14px", lineHeight: "1.95", fontSize: "9.5pt" }}>
                <div>☑ &nbsp;The value of the property as determined by the assessor is incorrect</div>
                <div>☑ &nbsp;The assessment was not performed in compliance with the rules of the
                  Department of Local Government Finance</div>
                {burden && (
                  <div>☑ &nbsp;Assessment increased by more than 5% — burden of proof shifts to
                    assessor (IC 6-1.1-15-20)</div>
                )}
                <div>☑ &nbsp;The property has physical defects and/or deferred maintenance not
                  properly reflected in the assessed value</div>
                {f.zillow_url && (
                  <div>☑ &nbsp;Comparable sales data demonstrates a lower fair market value</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ════════════ PAGE BREAK ════════════ */}
        <PageDivider label="— Page 2 of 3 —" />

        {/* ════════════════════════  PAGE 2  ════════════════════════ */}

        {/* ── Section 5 — Written Reasons ── */}
        <table style={S.table}>
          <tbody>
            <tr>
              <td style={{ ...S.hdr, textAlign: "left", padding: "4px 10px" }}>
                SECTION 5 — WRITTEN REASONS FOR APPEAL&nbsp;
                <span style={{ fontWeight: "normal", fontSize: "8pt" }}>
                  (State specific reasons why you believe the assessed value is incorrect.
                   Attach additional pages if necessary.)
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ ...S.cell, padding: 0 }}>
                {/* Lined-paper effect: text sits on top of ruled lines */}
                <div style={{
                  padding: "4px 14px 4px",
                  minHeight: `${LINE_H * 14}px`,
                  backgroundImage: `repeating-linear-gradient(
                    transparent, transparent ${LINE_H - 1}px,
                    #bbb ${LINE_H - 1}px, #bbb ${LINE_H}px)`,
                  backgroundSize: `100% ${LINE_H}px`,
                  backgroundPositionY: `${LINE_H - 1}px`,
                }}>
                  <div style={{
                    fontSize: "9pt",
                    lineHeight: `${LINE_H}px`,
                    whiteSpace: "pre-wrap",
                    minHeight: `${LINE_H * 13}px`,
                  }}>
                    {reasons}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Supporting evidence (when available) */}
        {f.supporting_docs_summary && (
          <table style={{ ...S.table, marginTop: 5 }}>
            <tbody>
              <SHdr>SUPPORTING EVIDENCE ATTACHED</SHdr>
              <tr>
                <td style={{ ...S.cell, padding: "8px 14px", fontSize: "9pt", lineHeight: 1.7 }}>
                  {f.supporting_docs_summary}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* ════════════ PAGE BREAK ════════════ */}
        <PageDivider label="— Page 3 of 3 —" />

        {/* ════════════════════════  PAGE 3  ════════════════════════ */}

        {/* ── Section 6 — Where to File ── */}
        {(f.assessor_name || f.deadline || f.assessor_address) && (
          <table style={S.table}>
            <tbody>
              <SHdr span={3}>SECTION 6 — WHERE TO RETURN THIS COMPLETED FORM</SHdr>
              <tr>
                <LC label="County Assessor / Office"   value={f.assessor_name}    />
                <LC label="Office Address"             value={f.assessor_address} colSpan={2} />
              </tr>
              {f.assessor_phone && (
                <tr>
                  <LC label="Phone" value={f.assessor_phone} />
                  <td colSpan={2} style={S.cell} />
                </tr>
              )}
              {f.deadline && (
                <tr>
                  <td colSpan={3} style={{ ...S.cell, background: "#fffde7", padding: "6px 12px" }}>
                    <span style={{ fontSize: "10pt", fontWeight: "bold" }}>
                      FILING DEADLINE:&nbsp; {f.deadline}
                    </span>
                    <span style={{ display: "block", fontSize: "8pt", marginTop: 2 }}>
                      This form must be filed with the County Assessor on or before this date.
                      Failure to timely file results in automatic dismissal of the appeal.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* ── Important Notice ── */}
        <table style={{ ...S.table, marginTop: 5 }}>
          <tbody>
            <SHdr>IMPORTANT NOTICE TO TAXPAYER</SHdr>
            <tr>
              <td style={{ ...S.cell, padding: "8px 14px", fontSize: "8.5pt", lineHeight: 1.85 }}>
                <p style={{ margin: "0 0 5px" }}>
                  <strong>Informal meeting:</strong>&nbsp; You have the right to an informal meeting
                  with the assessor prior to any formal hearing. An agreement at the informal stage may
                  resolve the appeal without a formal proceeding. Request a meeting as soon as this form
                  is filed.
                </p>
                <p style={{ margin: "0 0 5px" }}>
                  <strong>Evidence:</strong>&nbsp; Contact the assessor's office and request (1) your full
                  property record card (PRC), (2) the sales comparison grid or mass appraisal model data,
                  and (3) any neighborhood adjustment factors. This is your statutory right.
                </p>
                {burden && (
                  <p style={{ margin: 0, fontWeight: "bold" }}>
                    BURDEN OF PROOF: Your assessment increased more than 5%. The ASSESSOR must prove the
                    assessed value is correct — you need only demonstrate that the current value is
                    unreasonable. Two or three comparable sales below your assessed value can be decisive.
                  </p>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Certification & Signature ── */}
        <table style={{ ...S.table, marginTop: 5 }}>
          <tbody>
            <SHdr span={2}>CERTIFICATION AND SIGNATURE</SHdr>
            <tr>
              <td colSpan={2} style={{ ...S.cell, padding: "7px 14px", fontSize: "8.5pt", lineHeight: 1.7 }}>
                I hereby certify under penalties for perjury that the statements and facts contained
                in this petition are true and correct to the best of my knowledge and belief.
              </td>
            </tr>
            <tr>
              <td style={{ ...S.cell, padding: "12px 14px", width: "60%" }}>
                <span style={S.lbl}>Signature of Taxpayer or Authorized Representative</span>
                <div style={{ height: 34, borderBottom: "1px solid #000", marginTop: 6 }} />
              </td>
              <td style={{ ...S.cell, padding: "12px 14px" }}>
                <span style={S.lbl}>Date</span>
                <div style={{ height: 34, borderBottom: "1px solid #000", marginTop: 6,
                              paddingTop: 8, fontSize: "10.5pt", fontWeight: 600 }}>
                  {fmt(f.date)}
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ ...S.cell, padding: "7px 14px" }}>
                <span style={S.lbl}>Print Name</span>
                <span style={S.val}>{fmt(f.owner_name)}</span>
              </td>
            </tr>
          </tbody>
        </table>

      </div>{/* end paper */}

      {/* Styles injected once — print and screen-only helpers */}
      <style>{`
        @media print {
          .no-print   { display: none !important; }
          .screen-only { display: none !important; }
          body        { background: white !important; }
        }
        @media screen {
          .screen-only { display: block; }
        }
      `}</style>

    </div>
  );
}
