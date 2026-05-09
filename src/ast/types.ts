// UI AST — the intermediate representation between parsed markdown and emitted React.
// Every node has a `position` for error reporting back to the source `.md`.

export interface SourcePosition {
  column: number;
  line: number;
}

export type PropValue = string | number | boolean;

export type Props = Record<string, PropValue>;

// A page is the top-level node. One per `.md` file.
export interface PageNode {
  children: BlockNode[];
  frontmatter: Record<string, unknown>;
  position: SourcePosition;
  title: string | null;
  type: "page";
}

// A heading produces a Section. Sections render a title (h2 / h3 / ...).
export interface SectionNode {
  children: BlockNode[];
  level: number; // 2 for ##, 3 for ###, etc. (# is reserved for the page title)
  position: SourcePosition;
  title: string;
  type: "section";
}

// `@directive` lines: layout/structure wrappers like @stack, @card, @form.
export interface DirectiveNode {
  children: BlockNode[];
  name: string;
  position: SourcePosition;
  props: Props;
  type: "directive";
}

// `Component prop=val` lines: leaf React components.
// `children` is text content from the indented continuation lines.
export interface ComponentNode {
  children: InlineNode[];
  name: string;
  position: SourcePosition;
  props: Props;
  type: "component";
}

// Plain prose paragraphs (markdown text not consumed by directives or components).
export interface ParagraphNode {
  children: InlineNode[];
  position: SourcePosition;
  type: "paragraph";
}

// Inline content: text or a `{{ binding.path }}` interpolation.
export interface TextNode {
  type: "text";
  value: string;
}

export interface BindingNode {
  // Dotted path, e.g. ["billing", "nextInvoiceDate"].
  path: string[];
  type: "binding";
}

export type InlineNode = TextNode | BindingNode;

export type BlockNode =
  | SectionNode
  | DirectiveNode
  | ComponentNode
  | ParagraphNode;
