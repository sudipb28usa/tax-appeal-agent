import { useRef, useState } from "react";

export function DropZone({ step, file, onChange, unlocked }) {
  const inputRef = useRef();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (f) => { if (f && unlocked) onChange(step.id, f); };

  const borderColor = !unlocked ? "#2d3748" : isDragging ? "#60a5fa" : file ? "#34d399" : "#4b5563";
  const bgColor     = !unlocked ? "rgba(0,0,0,.2)" : isDragging ? "rgba(96,165,250,.08)" : file ? "rgba(52,211,153,.07)" : "rgba(255,255,255,.03)";

  return (
    <div
      onClick={() => unlocked && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); if (unlocked) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
      style={{ border: `2px dashed ${borderColor}`, borderRadius: 12, padding: "15px 14px", cursor: unlocked ? "pointer" : "default", background: bgColor, transition: "all .25s", opacity: unlocked ? 1 : 0.45 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={step.accept}
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 24, flexShrink: 0 }}>{file ? "✅" : step.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: file ? "#34d399" : unlocked ? "#f1f5f9" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file ? file.name : step.label}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {!unlocked
              ? "🔒 Upload previous document first"
              : file
                ? "Uploaded · click to replace"
                : step.required ? "Required" : "Optional · drag or click"}
          </div>
        </div>
        <div style={{ background: step.required && !file && unlocked ? "#dc2626" : "#374151", color: step.required && !file && unlocked ? "#fff" : "#9ca3af", fontSize: 10, padding: "2px 7px", borderRadius: 99, flexShrink: 0 }}>
          {step.required ? (file ? "✓" : "Required") : (file ? "✓" : "Optional")}
        </div>
      </div>
    </div>
  );
}
