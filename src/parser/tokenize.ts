// Line-based tokenizer for markdown-computer source files.
// Each non-blank line of the body is classified into exactly one Token.

export interface HeadingToken {
  indent: number; // leading-space count
  kind: "heading";
  level: number;
  line: number; // 1-based
  text: string;
}

export interface DirectiveToken {
  indent: number;
  kind: "directive";
  line: number;
  name: string;
  rawProps: string;
}

export interface ComponentToken {
  childText: string; // joined indented continuation lines (already de-indented)
  indent: number;
  kind: "component";
  line: number;
  name: string;
  rawProps: string;
}

export interface TextToken {
  indent: number;
  kind: "text";
  line: number;
  text: string;
}

export type Token = HeadingToken | DirectiveToken | ComponentToken | TextToken;

export interface TokenizeResult {
  frontmatter: string | null; // raw YAML content between --- markers, or null
  tokens: Token[];
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const DIRECTIVE_RE = /^@([a-zA-Z][a-zA-Z0-9_-]*)\s*(.*)$/;
const COMPONENT_RE = /^([A-Z][A-Za-z0-9_]*)(?:\s+(.*))?$/;
const NEWLINE_RE = /\r?\n/;
const LEADING_WS_RE = /^\s+/;

export function tokenize(
  source: string,
  isComponent: (name: string) => boolean
): TokenizeResult {
  const lines = source.split(NEWLINE_RE);
  const { frontmatter, bodyStart } = extractFrontmatter(lines);
  const tokens = collectTokens(lines, bodyStart, isComponent);
  return { frontmatter, tokens };
}

function extractFrontmatter(lines: string[]): {
  frontmatter: string | null;
  bodyStart: number;
} {
  if (lines[0] !== "---") {
    return { frontmatter: null, bodyStart: 0 };
  }
  const fmLines: string[] = [];
  let i = 1;
  while (i < lines.length && lines[i] !== "---") {
    fmLines.push(lines[i] ?? "");
    i++;
  }
  if (i >= lines.length) {
    // No closing fence; treat as no frontmatter.
    return { frontmatter: null, bodyStart: 0 };
  }
  return { frontmatter: fmLines.join("\n"), bodyStart: i + 1 };
}

function collectTokens(
  lines: string[],
  start: number,
  isComponent: (name: string) => boolean
): Token[] {
  const tokens: Token[] = [];
  let i = start;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const lineNumber = i + 1;
    const trimmed = raw.replace(LEADING_WS_RE, "");
    if (trimmed === "") {
      i++;
      continue;
    }
    const indent = raw.length - trimmed.length;
    const headingTok = matchHeading(trimmed, lineNumber, indent);
    if (headingTok) {
      tokens.push(headingTok);
      i++;
      continue;
    }
    const directiveTok = matchDirective(trimmed, lineNumber, indent);
    if (directiveTok) {
      tokens.push(directiveTok);
      i++;
      continue;
    }
    const componentTok = matchComponent(
      trimmed,
      lineNumber,
      indent,
      lines,
      i,
      isComponent
    );
    if (componentTok) {
      tokens.push(componentTok.token);
      i = componentTok.nextIndex;
      continue;
    }
    tokens.push({ kind: "text", text: trimmed, line: lineNumber, indent });
    i++;
  }
  return tokens;
}

function matchHeading(
  trimmed: string,
  lineNumber: number,
  indent: number
): HeadingToken | null {
  const m = trimmed.match(HEADING_RE);
  if (!m) {
    return null;
  }
  return {
    kind: "heading",
    level: m[1]?.length ?? 1,
    text: m[2]?.trim() ?? "",
    line: lineNumber,
    indent,
  };
}

function matchDirective(
  trimmed: string,
  lineNumber: number,
  indent: number
): DirectiveToken | null {
  const m = trimmed.match(DIRECTIVE_RE);
  if (!m) {
    return null;
  }
  return {
    kind: "directive",
    name: m[1] ?? "",
    rawProps: (m[2] ?? "").trim(),
    line: lineNumber,
    indent,
  };
}

function matchComponent(
  trimmed: string,
  lineNumber: number,
  indent: number,
  lines: string[],
  i: number,
  isComponent: (name: string) => boolean
): { token: ComponentToken; nextIndex: number } | null {
  const m = trimmed.match(COMPONENT_RE);
  if (!(m && isComponent(m[1] ?? ""))) {
    return null;
  }
  const name = m[1] ?? "";
  const rawProps = (m[2] ?? "").trim();
  const { childText, nextIndex } = collectIndentedChildren(lines, i, indent);
  return {
    token: {
      kind: "component",
      name,
      rawProps,
      childText,
      line: lineNumber,
      indent,
    },
    nextIndex,
  };
}

function collectIndentedChildren(
  lines: string[],
  start: number,
  parentIndent: number
): { childText: string; nextIndex: number } {
  const parts: string[] = [];
  let j = start + 1;
  while (j < lines.length) {
    const next = lines[j] ?? "";
    if (next.trim() === "") {
      break;
    }
    const nextTrim = next.replace(LEADING_WS_RE, "");
    const nextIndent = next.length - nextTrim.length;
    if (nextIndent <= parentIndent) {
      break;
    }
    parts.push(nextTrim);
    j++;
  }
  return { childText: parts.join("\n"), nextIndex: j };
}
