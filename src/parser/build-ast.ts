import { parse as parseYaml } from "yaml";
import type {
  BlockNode,
  ComponentNode,
  DirectiveNode,
  PageNode,
  ParagraphNode,
  SectionNode,
} from "../ast/types";
import type { Registry } from "../registry/types";
import { parseInline } from "./parse-inline";
import { parseProps } from "./parse-props";
import { type Token, tokenize } from "./tokenize";

// Build a UI AST from raw source.
// Section nesting follows heading levels (## opens a level-2 section, etc.).
// `@directive` lines open a wrapper that continues until the next heading at
// the same-or-shallower level OR end-of-input.
// Multiple directives at the start of a section nest in source order
// (first one becomes outermost).
export function buildAst(source: string, registry: Registry): PageNode {
  const isComponent = (name: string): boolean => {
    const entry = registry[name];
    return entry?.kind === "component";
  };

  const { frontmatter, tokens } = tokenize(source, isComponent);

  // Frontmatter
  let fm: Record<string, unknown> = {};
  if (frontmatter !== null && frontmatter.trim().length > 0) {
    const parsed = parseYaml(frontmatter);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      fm = parsed as Record<string, unknown>;
    }
  }

  // Page title: prefer frontmatter `title`, fall back to first H1 token.
  let title: string | null = typeof fm.title === "string" ? fm.title : null;
  let cursor = 0;
  if (title === null) {
    const firstHeading = tokens[0];
    if (firstHeading?.kind === "heading" && firstHeading.level === 1) {
      title = firstHeading.text;
      cursor = 1;
    }
  } else {
    // Skip a leading H1 if it's just restating the frontmatter title.
    const firstHeading = tokens[0];
    if (
      firstHeading?.kind === "heading" &&
      firstHeading.level === 1 &&
      firstHeading.text === title
    ) {
      cursor = 1;
    }
  }

  // Build the body. We descend by heading levels.
  // Headings define structural sections; everything else nests under the
  // current heading via the `consumeBlocks` helper.
  const { children, end } = consumeSection(tokens, cursor, registry, 1);
  if (end !== tokens.length) {
    // Should not happen — consumeSection drains to end at level 1.
  }

  return {
    type: "page",
    title,
    frontmatter: fm,
    children,
    position: { line: 1, column: 1 },
  };
}

// Consume tokens that belong to a section of the given level.
// Stops at the first heading whose level is <= currentLevel.
function consumeSection(
  tokens: Token[],
  start: number,
  registry: Registry,
  currentLevel: number
): { children: BlockNode[]; end: number } {
  const children: BlockNode[] = [];
  let i = start;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (!tok) {
      break;
    }
    if (tok.kind === "heading") {
      if (tok.level <= currentLevel) {
        // Belongs to an outer section.
        break;
      }
      // Open a new sub-section.
      const { children: sub, end } = consumeSection(
        tokens,
        i + 1,
        registry,
        tok.level
      );
      const section: SectionNode = {
        type: "section",
        level: tok.level,
        title: tok.text,
        children: sub,
        position: { line: tok.line, column: tok.indent + 1 },
      };
      children.push(section);
      i = end;
      continue;
    }
    if (tok.kind === "directive") {
      // A directive consumes the remainder of the current section, nesting
      // any subsequent directives or components inside it.
      const { node, end } = consumeDirectiveChain(
        tokens,
        i,
        registry,
        currentLevel
      );
      children.push(node);
      i = end;
      continue;
    }
    if (tok.kind === "component") {
      children.push(makeComponentNode(tok, registry));
      i++;
      continue;
    }
    // tok.kind === "text"
    children.push(makeParagraphNode(tok));
    i++;
  }
  return { children, end: i };
}

// One or more directives in a row form a chain that wraps the rest of the
// current section. The first directive is outermost.
function consumeDirectiveChain(
  tokens: Token[],
  start: number,
  registry: Registry,
  sectionLevel: number
): { node: DirectiveNode; end: number } {
  const head = tokens[start];
  if (!head || head.kind !== "directive") {
    throw new Error("consumeDirectiveChain expected a directive token");
  }
  const next = tokens[start + 1];
  if (next && next.kind === "directive") {
    const inner = consumeDirectiveChain(
      tokens,
      start + 1,
      registry,
      sectionLevel
    );
    return {
      node: {
        type: "directive",
        name: head.name,
        props: parseProps(head.rawProps),
        children: [inner.node],
        position: { line: head.line, column: head.indent + 1 },
      },
      end: inner.end,
    };
  }
  // Otherwise gather everything until the next heading at <= sectionLevel.
  const innerStart = start + 1;
  const inner = consumeUntilHeading(tokens, innerStart, registry, sectionLevel);
  return {
    node: {
      type: "directive",
      name: head.name,
      props: parseProps(head.rawProps),
      children: inner.children,
      position: { line: head.line, column: head.indent + 1 },
    },
    end: inner.end,
  };
}

// Gather components / paragraphs / nested sections until a closing heading
// or end-of-input. Used as the body of a directive.
function consumeUntilHeading(
  tokens: Token[],
  start: number,
  registry: Registry,
  sectionLevel: number
): { children: BlockNode[]; end: number } {
  const children: BlockNode[] = [];
  let i = start;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (!tok) {
      break;
    }
    if (tok.kind === "heading" && tok.level <= sectionLevel) {
      break;
    }
    if (tok.kind === "heading") {
      // Sub-heading inside the directive — recurse as a section.
      const { children: sub, end } = consumeSection(
        tokens,
        i + 1,
        registry,
        tok.level
      );
      children.push({
        type: "section",
        level: tok.level,
        title: tok.text,
        children: sub,
        position: { line: tok.line, column: tok.indent + 1 },
      });
      i = end;
      continue;
    }
    if (tok.kind === "directive") {
      const { node, end } = consumeDirectiveChain(
        tokens,
        i,
        registry,
        sectionLevel
      );
      children.push(node);
      i = end;
      continue;
    }
    if (tok.kind === "component") {
      children.push(makeComponentNode(tok, registry));
      i++;
      continue;
    }
    children.push(makeParagraphNode(tok));
    i++;
  }
  return { children, end: i };
}

function makeComponentNode(
  tok: Extract<Token, { kind: "component" }>,
  _registry: Registry
): ComponentNode {
  return {
    type: "component",
    name: tok.name,
    props: parseProps(tok.rawProps),
    children: parseInline(tok.childText),
    position: { line: tok.line, column: tok.indent + 1 },
  };
}

function makeParagraphNode(
  tok: Extract<Token, { kind: "text" }>
): ParagraphNode {
  return {
    type: "paragraph",
    children: parseInline(tok.text),
    position: { line: tok.line, column: tok.indent + 1 },
  };
}
