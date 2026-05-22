import { useState, useRef, useCallback } from "react";
import { callClaude } from "../api/claude";
import { readB64 } from "../utils/file";
import { parseReply } from "../utils/parser";
import { STEPS } from "../constants/steps";
import { SYSTEM_DOCS, SYSTEM_NO_DOCS } from "../constants/prompts";

const ANALYSIS_STAGES = {
  withDocs: [
    { label: "Reading Appeal Form…",            pct: 15 },
    { label: "Reading Assessment Notice…",      pct: 32 },
    { label: "Analyzing supporting documents…", pct: 52 },
    { label: "Extracting evidence…",            pct: 68 },
    { label: "Cross-referencing documents…",    pct: 82 },
    { label: "Building roadmap…",               pct: 93 },
  ],
  withoutDocs: [
    { label: "Reading Appeal Form…",                      pct: 15 },
    { label: "Reading Assessment Notice…",                pct: 32 },
    { label: "Detecting state & county…",                 pct: 48 },
    { label: "Researching county appeal process…",        pct: 65 },
    { label: "Looking up statutes & deadlines…",          pct: 80 },
    { label: "Building personalized roadmap…",            pct: 93 },
  ],
};

export function useAnalysis({ files, zillow, damages, hasSupporting }) {
  const [progress, setProgress]           = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [detectedCounty, setDetectedCounty] = useState("");
  const timerRef = useRef();

  const buildContent = useCallback(async () => {
    const content = [];
    for (const step of STEPS) {
      const file = files[step.id];
      if (!file) continue;
      const b64 = await readB64(file);
      const isImage = file.type.startsWith("image/");
      content.push(
        isImage
          ? { type: "image",    source: { type: "base64", media_type: file.type,               data: b64 } }
          : { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      );
      content.push({ type: "text", text: `[Above file is: ${step.label}]` });
    }
    content.push({
      type: "text",
      text: [
        `Zillow URL: ${zillow || "Not provided"}`,
        `House damages:\n${damages || "None provided yet"}`,
        `Supporting process documents uploaded: ${hasSupporting ? "YES — analyze for evidence" : "NO — research this jurisdiction's appeal process from your knowledge"}`,
        `Please extract all fields, ${hasSupporting ? "analyze supporting docs" : "research the full jurisdiction-specific appeal process"}, then generate the complete filled form.`,
      ].join("\n"),
    });
    return content;
  }, [files, zillow, damages, hasSupporting]);

  const tickProgress = (stages) => {
    let i = 0;
    setProgress(stages[0].pct);
    setProgressLabel(stages[0].label);
    timerRef.current = setInterval(() => {
      i++;
      if (i < stages.length) {
        setProgress(stages[i].pct);
        setProgressLabel(stages[i].label);
      } else {
        clearInterval(timerRef.current);
      }
    }, 950);
  };

  const stopProgress = () => clearInterval(timerRef.current);

  const run = async () => {
    const stages = hasSupporting ? ANALYSIS_STAGES.withDocs : ANALYSIS_STAGES.withoutDocs;
    tickProgress(stages);

    const content = await buildContent();
    const systemPrompt = hasSupporting ? SYSTEM_DOCS : SYSTEM_NO_DOCS;
    const reply = await callClaude([{ role: "user", content }], systemPrompt, () => {});

    stopProgress();
    setProgress(100);
    setProgressLabel("Complete!");
    await new Promise((resolve) => setTimeout(resolve, 350));

    const parsed = parseReply(reply);
    if (parsed.formData?.county) setDetectedCounty(parsed.formData.county);
    return parsed;
  };

  return { run, stopProgress, progress, progressLabel, detectedCounty };
}
