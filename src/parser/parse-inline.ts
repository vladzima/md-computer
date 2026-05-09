import type { InlineNode } from "../ast/types";

const BINDING_RE = /\{\{\s*([a-zA-Z_$][\w.$]*)\s*\}\}/g;

// Convert a string into a sequence of TextNode + BindingNode chunks.
// `{{ a.b.c }}` becomes a BindingNode with path ["a", "b", "c"].
export function parseInline(text: string): InlineNode[] {
  if (!text) {
    return [];
  }
  const out: InlineNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null = BINDING_RE.exec(text);
  while (m !== null) {
    const start = m.index;
    if (start > lastIndex) {
      out.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    const path = (m[1] ?? "").split(".").filter(Boolean);
    out.push({ type: "binding", path });
    lastIndex = start + m[0].length;
    m = BINDING_RE.exec(text);
  }
  if (lastIndex < text.length) {
    out.push({ type: "text", value: text.slice(lastIndex) });
  }
  return out;
}
