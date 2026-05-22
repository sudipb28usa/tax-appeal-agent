// Case-insensitive, allows optional whitespace inside tag brackets.
const STRUCTURED_TAG_PATTERN = /<(FORM_DATA|NEXT_ACTIONS|PROCESS_INFO)\s*>[\s\S]*?<\/\s*\1\s*>/gi;

function extractTag(text, tag) {
  // Primary: properly closed tag
  const closedRe = new RegExp(`<${tag}\\s*>([\\s\\S]*?)<\\/\\s*${tag}\\s*>`, "i");
  const closed = text.match(closedRe);
  if (closed) {
    try { return JSON.parse(closed[1].trim()); } catch { return null; }
  }

  // Fallback: tag opened but response was truncated before closing tag.
  // Scan forward from the opening tag and find the first complete JSON value.
  const openRe = new RegExp(`<${tag}\\s*>([\\s\\S]+)`, "i");
  const open = text.match(openRe);
  if (!open) return null;

  const raw = open[1].trim();
  const start = raw.search(/[{[]/);
  if (start === -1) return null;

  // Walk character-by-character to find the matching closing bracket.
  let depth = 0, inStr = false, escape = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (escape)          { escape = false; continue; }
    if (c === "\\")      { escape = true;  continue; }
    if (c === '"')       { inStr = !inStr; continue; }
    if (inStr)           continue;
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(raw.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function stripStructuredTags(text) {
  return text
    .replace(STRUCTURED_TAG_PATTERN, "")
    // Also strip --- json {...} / --- json [...] blocks Claude may emit instead of XML tags.
    .replace(/---\s*json\s*[\[{][\s\S]*?[\]}]/g, "")
    .trim();
}

function extractHTML(text) {
  // Strip structured tags first so they don't appear inside the rendered form,
  // then remove any markdown code fences Claude occasionally wraps the HTML in.
  const stripped = stripStructuredTags(text)
    .replace(/```html?/gi, "")
    .replace(/```/g, "")
    .trim();

  // Skip any narrative preamble and find where actual block-level HTML starts.
  // If no HTML is found, return "" so the caller routes to chat mode instead
  // of rendering raw text through dangerouslySetInnerHTML.
  const htmlStart = stripped.search(/<(div|table|html)\b/i);
  if (htmlStart === -1) return "";
  return stripped.slice(htmlStart).trim();
}

export function parseReply(reply) {
  return {
    formData:    extractTag(reply, "FORM_DATA"),
    nextActions: extractTag(reply, "NEXT_ACTIONS"),
    processInfo: extractTag(reply, "PROCESS_INFO"),
    html:        extractHTML(reply),
    clean:       stripStructuredTags(reply),
  };
}
