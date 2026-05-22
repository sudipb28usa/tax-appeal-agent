const STRUCTURED_TAG_PATTERN = /<(FORM_DATA|NEXT_ACTIONS|PROCESS_INFO)>[\s\S]*?<\/\1>/g;

function extractTag(text, tag) {
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function stripStructuredTags(text) {
  return text.replace(STRUCTURED_TAG_PATTERN, "").trim();
}

function extractHTML(text) {
  return stripStructuredTags(text)
    .replace(/```html?/gi, "")
    .replace(/```/g, "")
    .trim();
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
