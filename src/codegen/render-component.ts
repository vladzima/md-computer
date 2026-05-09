import type { ComponentNode, InlineNode, Props } from "../ast/types";
import { addImport, type CodegenContext, useRegistryEntry } from "./context";
import { indent, jsxAttrString, renderInline, renderProps } from "./jsx";

// Render a leaf component invocation (Input, Button, Badge, …) as JSX.
// Each component has hand-written rendering rules — there is no general
// JSX templating in v1 because shadcn components have non-uniform shapes
// (Input wants a separate Label wrapper, Switch wants a flex row, etc.).
export function renderComponent(
  node: ComponentNode,
  ctx: CodegenContext,
  level: number
): string {
  useRegistryEntry(ctx, node.name);
  switch (node.name) {
    case "Input":
      return renderInput(node, ctx, level);
    case "Textarea":
      return renderTextarea(node, ctx, level);
    case "Switch":
      return renderSwitch(node, ctx, level);
    case "Button":
      return renderButton(node, ctx, level);
    case "Badge":
      return renderBadge(node, ctx, level);
    case "Text":
      return renderText(node, ctx, level);
    default:
      // Permissive fallback: emit `<Name {...props}>{children}</Name>` so
      // unknown components still produce something compileable; the user
      // (or v2) can tighten this with stricter validation.
      return renderGeneric(node, ctx, level);
  }
}

function renderInput(
  node: ComponentNode,
  _ctx: CodegenContext,
  level: number
): string {
  const id = idFromProps(node.props);
  const label = stringProp(node.props, "label");
  const inputAttrs = renderProps(
    node.props,
    new Set(["label"])
  );
  const labelLine =
    label !== undefined
      ? `${indent(level + 1)}<Label htmlFor=${jsxAttrString(id)}>${label}</Label>\n`
      : "";
  return [
    `${indent(level)}<div className="flex flex-col gap-2">\n`,
    labelLine,
    `${indent(level + 1)}<Input id=${jsxAttrString(id)}${inputAttrs} />\n`,
    `${indent(level)}</div>`,
  ].join("");
}

function renderTextarea(
  node: ComponentNode,
  _ctx: CodegenContext,
  level: number
): string {
  const id = idFromProps(node.props);
  const label = stringProp(node.props, "label");
  const inputAttrs = renderProps(node.props, new Set(["label"]));
  const labelLine =
    label !== undefined
      ? `${indent(level + 1)}<Label htmlFor=${jsxAttrString(id)}>${label}</Label>\n`
      : "";
  return [
    `${indent(level)}<div className="flex flex-col gap-2">\n`,
    labelLine,
    `${indent(level + 1)}<Textarea id=${jsxAttrString(id)}${inputAttrs} />\n`,
    `${indent(level)}</div>`,
  ].join("");
}

function renderSwitch(
  node: ComponentNode,
  _ctx: CodegenContext,
  level: number
): string {
  const id = idFromProps(node.props);
  const label = stringProp(node.props, "label");
  const inputAttrs = renderProps(node.props, new Set(["label"]));
  const labelLine =
    label !== undefined
      ? `${indent(level + 1)}<Label htmlFor=${jsxAttrString(id)}>${label}</Label>\n`
      : "";
  return [
    `${indent(level)}<div className="flex items-center gap-2">\n`,
    `${indent(level + 1)}<Switch id=${jsxAttrString(id)}${inputAttrs} />\n`,
    labelLine,
    `${indent(level)}</div>`,
  ].join("");
}

function renderButton(
  node: ComponentNode,
  ctx: CodegenContext,
  level: number
): string {
  const action = stringProp(node.props, "action");
  const skip = new Set(["action"]);
  const attrs = renderProps(node.props, skip);
  const handler = action ? ` onClick={() => actions.${action}()}` : "";
  if (action) {
    ctx.actionsUsed.add(action);
  }
  const childText = renderInline(node.children);
  return `${indent(level)}<Button${attrs}${handler}>${childText}</Button>`;
}

function renderBadge(
  node: ComponentNode,
  _ctx: CodegenContext,
  level: number
): string {
  const attrs = renderProps(node.props);
  const childText = renderInline(node.children);
  return `${indent(level)}<Badge${attrs}>${childText}</Badge>`;
}

function renderText(
  node: ComponentNode,
  ctx: CodegenContext,
  level: number
): string {
  const tone = stringProp(node.props, "tone");
  const cls = tone === "muted" ? ' className="text-muted-foreground"' : "";
  const childText = renderInlineWithTracking(node.children, ctx);
  return `${indent(level)}<p${cls}>${childText}</p>`;
}

function renderGeneric(
  node: ComponentNode,
  ctx: CodegenContext,
  level: number
): string {
  const attrs = renderProps(node.props);
  const childText = renderInlineWithTracking(node.children, ctx);
  if (childText.length === 0) {
    return `${indent(level)}<${node.name}${attrs} />`;
  }
  return `${indent(level)}<${node.name}${attrs}>${childText}</${node.name}>`;
}

function renderInlineWithTracking(
  nodes: InlineNode[],
  ctx: CodegenContext
): string {
  for (const n of nodes) {
    if (n.type === "binding" && n.path.length > 0) {
      const root = n.path[0];
      if (root) {
        ctx.bindingsUsed.add(root);
      }
    }
  }
  return renderInline(nodes);
}

// Inputs and labels need an `id` so the label's `htmlFor` lines up. Prefer
// the source-provided `id`, fall back to `name`, fall back to a placeholder.
function idFromProps(props: Props): string {
  const id = stringProp(props, "id");
  if (id !== undefined) {
    return id;
  }
  const name = stringProp(props, "name");
  if (name !== undefined) {
    return name;
  }
  return "field";
}

function stringProp(props: Props, key: string): string | undefined {
  const v = props[key];
  return typeof v === "string" ? v : undefined;
}
