import { useState } from "react";

const INITIAL = {
  phase: "upload",
  files: {},
  zillow: "",
  damages: "",
  formHTML: "",
  formData: null,
  nextActions: null,
  processInfo: null,
  supportingSummary: "",
  error: "",
};

export function useAppState() {
  const [phase, setPhase]                     = useState(INITIAL.phase);
  const [files, setFiles]                     = useState(INITIAL.files);
  const [zillow, setZillow]                   = useState(INITIAL.zillow);
  const [damages, setDamages]                 = useState(INITIAL.damages);
  const [formHTML, setFormHTML]               = useState(INITIAL.formHTML);
  const [formData, setFormData]               = useState(INITIAL.formData);
  const [nextActions, setNextActions]         = useState(INITIAL.nextActions);
  const [processInfo, setProcessInfo]         = useState(INITIAL.processInfo);
  const [supportingSummary, setSupportingSummary] = useState(INITIAL.supportingSummary);
  const [error, setError]                     = useState(INITIAL.error);

  const setFile = (id, file) => setFiles((prev) => ({ ...prev, [id]: file }));

  // Applies a parsed Claude reply into shared state.
  const applyParsed = ({ formData: fd, nextActions: na, processInfo: pi, html }) => {
    if (fd) {
      setFormData(fd);
      if (fd.supporting_docs_summary) setSupportingSummary(fd.supporting_docs_summary);
    }
    if (na) setNextActions(na);
    if (pi) setProcessInfo(pi);
    if (html?.length > 300) setFormHTML(html);
  };

  const reset = () => {
    setPhase(INITIAL.phase);
    setFiles(INITIAL.files);
    setZillow(INITIAL.zillow);
    setDamages(INITIAL.damages);
    setFormHTML(INITIAL.formHTML);
    setFormData(INITIAL.formData);
    setNextActions(INITIAL.nextActions);
    setProcessInfo(INITIAL.processInfo);
    setSupportingSummary(INITIAL.supportingSummary);
    setError(INITIAL.error);
  };

  return {
    phase, setPhase,
    files, setFile,
    zillow, setZillow,
    damages, setDamages,
    formHTML,
    formData,
    nextActions,
    processInfo,
    supportingSummary,
    error, setError,
    hasSupporting: !!files["supporting"],
    canStart: !!(files["appeal"] && files["notice"]),
    applyParsed,
    reset,
  };
}
