import type { DirectiveNode, Props } from "../ast/types";
import type { CodegenContext } from "./context";
import { useRegistryEntry } from "./context";
import { indent } from "./jsx";

// Render the children of any directive at the requested indent level.
// `renderChildrenFn` is injected to break the circular import with the
// general block renderer (directive -> block -> directive).
type RenderChildrenFn = (
  children: import("../ast/types").BlockNode[],
  ctx: CodegenContext,
  level: number
) => string;

export function renderDirective(
  node: DirectiveNode,
  ctx: CodegenContext,
  level: number,
  renderChildren: RenderChildrenFn,
  // Optional title hoisted from a parent SectionNode (used when @card sits
  // directly inside a `##` heading and adopts that heading as its CardTitle).
  hoistedTitle: string | null = null
): string {
  useRegistryEntry(ctx, node.name);
  switch (node.name) {
    case "stack":
      return renderStack(node, ctx, level, renderChildren);
    case "grid":
      return renderGrid(node, ctx, level, renderChildren);
    case "section":
      return renderPlainSection(node, ctx, level, renderChildren);
    case "card":
      return renderCard(node, ctx, level, renderChildren, hoistedTitle);
    case "form":
      return renderForm(node, ctx, level, renderChildren);
    default:
      return renderGenericDirective(node, ctx, level, renderChildren);
  }
}

function renderStack(
  node: DirectiveNode,
  ctx: CodegenContext,
  level: number,
  renderChildren: RenderChildrenFn
): string {
  const gap = numberProp(node.props, "gap") ?? 4;
  const inner = renderChildren(node.children, ctx, level + 1);
  return `${indent(level)}<div className="flex flex-col gap-${gap}">\n${inner}\n${indent(level)}</div>`;
}

function renderGrid(
  node: DirectiveNode,
  ctx: CodegenContext,
  level: number,
  renderChildren: RenderChildrenFn
): string {
  const cols = numberProp(node.props, "cols") ?? 2;
  const gap = numberProp(node.props, "gap") ?? 4;
  const inner = renderChildren(node.children, ctx, level + 1);
  return `${indent(level)}<div className="grid grid-cols-${cols} gap-${gap}">\n${inner}\n${indent(level)}</div>`;
}

function renderPlainSection(
  node: DirectiveNode,
  ctx: CodegenContext,
  level: number,
  renderChildren: RenderChildrenFn
): string {
  const inner = renderChildren(node.children, ctx, level + 1);
  return `${indent(level)}<section>\n${inner}\n${indent(level)}</section>`;
}

function renderCard(
  node: DirectiveNode,
  ctx: CodegenContext,
  level: number,
  renderChildren: RenderChildrenFn,
  hoistedTitle: string | null
): string {
  const variant = stringProp(node.props, "variant");
  const className = variant === "destructive" ? ' className="border-destructive"' : "";
  const inner = renderChildren(node.children, ctx, level + 2);
  const header = hoistedTitle
    ? `${indent(level + 1)}<CardHeader>\n${indent(level + 2)}<CardTitle>${hoistedTitle}</CardTitle>\n${indent(level + 1)}</CardHeader>\n`
    : "";
  return [
    `${indent(level)}<Card${className}>\n`,
    header,
    `${indent(level + 1)}<CardContent className="flex flex-col gap-4">\n`,
    inner,
    "\n",
    `${indent(level + 1)}</CardContent>\n`,
    `${indent(level)}</Card>`,
  ].join("");
}

function renderForm(
  node: DirectiveNode,
  ctx: CodegenContext,
  level: number,
  renderChildren: RenderChildrenFn
): string {
  const submit = stringProp(node.props, "submit");
  const inner = renderChildren(node.children, ctx, level + 1);
  if (submit) {
    ctx.actionsUsed.add(submit);
    return [
      `${indent(level)}<form\n`,
      `${indent(level + 1)}className="flex flex-col gap-4"\n`,
      `${indent(level + 1)}onSubmit={(e) => {\n`,
      `${indent(level + 2)}e.preventDefault();\n`,
      `${indent(level + 2)}actions.${submit}(new FormData(e.currentTarget));\n`,
      `${indent(level + 1)}}}\n`,
      `${indent(level)}>\n`,
      inner,
      "\n",
      `${indent(level)}</form>`,
    ].join("");
  }
  return `${indent(level)}<form className="flex flex-col gap-4">\n${inner}\n${indent(level)}</form>`;
}

function renderGenericDirective(
  node: DirectiveNode,
  ctx: CodegenContext,
  level: number,
  renderChildren: RenderChildrenFn
): string {
  const inner = renderChildren(node.children, ctx, level + 1);
  return `${indent(level)}<div data-directive="${node.name}">\n${inner}\n${indent(level)}</div>`;
}

function stringProp(props: Props, key: string): string | undefined {
  const v = props[key];
  return typeof v === "string" ? v : undefined;
}

function numberProp(props: Props, key: string): number | undefined {
  const v = props[key];
  return typeof v === "number" ? v : undefined;
}
