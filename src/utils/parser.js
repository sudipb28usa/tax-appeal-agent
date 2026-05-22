const STRUCTURED_TAG_PATTERN = /<(FORM_DATA|NEXT_ACTIONS|PROCESS_INFO)>[\s\S]*?<\/\1>/g;

function extractTag(text, tag) {
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function stripStructuredTags(text) {
  return text
    .replace(STRUCTURED_TAG_PATTERN, "")
    // Also strip any --- json {...} / --- json [...] blocks Claude may emit
    // instead of the expected XML tags.
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
