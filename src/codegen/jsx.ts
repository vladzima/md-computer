// Helpers for assembling small bits of JSX as strings.
// Codegen builds the full file by composing these.

import type { InlineNode, Props } from "../ast/types";

export function indent(level: number): string {
  return "  ".repeat(level);
}

// Encode a string for a JSX text body. Curly braces must be escaped.
export function escapeJsxText(s: string): string {
  return s.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
}

// Encode a string as a JSX attribute value (double-quoted).
export function jsxAttrString(s: string): string {
  return `"${s.replace(/"/g, "&quot;")}"`;
}

// Render a className attribute, or empty string when the class set is empty.
// Used by directive/component renderers after assembling classes via
// `buildClassName`.
export function classAttr(s: string): string {
  return s.length > 0 ? ` className=${jsxAttrString(s)}` : "";
}

// Render an inline sequence (text + bindings) into a JSX-children expression.
// Text nodes become literal text; bindings become `{bindings.path}`.
// Adjacent text nodes are concatenated.
export function renderInline(
  nodes: InlineNode[],
  bindingsParam = "bindings"
): string {
  if (nodes.length === 0) {
    return "";
  }
  return nodes
    .map((n) => {
      if (n.type === "text") {
        return escapeJsxText(n.value);
      }
      const path = n.path.join(".");
      return `{${bindingsParam}.${path}}`;
    })
    .join("");
}

// Pure-text renderer for use in JSX attributes (no JSX expressions allowed).
export function renderInlineAsString(nodes: InlineNode[]): string {
  return nodes
    .map((n) => (n.type === "text" ? n.value : `{{${n.path.join(".")}}}`))
    .join("");
}

// Render a Props map as a string of JSX attributes (each prefixed with a space).
// Keys whose value is `true` become bare attributes (`disabled`).
// Skips a configurable list of keys (used by callers to omit reserved props
// like `action` or `submit` that get transformed elsewhere).
export function renderProps(props: Props, skip: Set<string> = new Set()): string {
  const out: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (skip.has(key)) {
      continue;
    }
    if (value === true) {
      out.push(` ${key}`);
      continue;
    }
    if (value === false) {
      continue;
    }
    if (typeof value === "number") {
      out.push(` ${key}={${value}}`);
      continue;
    }
    out.push(` ${key}=${jsxAttrString(String(value))}`);
  }
  return out.join("");
}
