import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "sup",
  "sub",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "span"
];

const allowedAttributes: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title"]
};

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags,
  allowedAttributes,
  allowedSchemes: ["http", "https", "mailto"],
  disallowedTagsMode: "discard",
  transformTags: {
    b: "strong",
    i: "em",
    div: "p"
  },
  exclusiveFilter(frame) {
    const text = typeof frame.text === "string" ? frame.text.trim() : "";
    return text.length === 0 && frame.tag !== "br";
  }
};

export function sanitizeSeoContent(value: string | null | undefined): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "";
  }

  const sanitized = sanitizeHtml(trimmed, sanitizeOptions).trim();
  return sanitized;
}
