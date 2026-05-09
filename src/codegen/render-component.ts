import type { ComponentNode, InlineNode, Props } from "../ast/types";
import {
  buildClassName,
  classFromMap,
  stringProp,
  TEXT_ALIGN,
  TEXT_SIZE,
  TEXT_TONE,
  TEXT_WEIGHT,
  WIDTH,
} from "./classes";
import { type CodegenContext, useRegistryEntry } from "./context";
import { classAttr, indent, jsxAttrString, renderInline, renderProps } from "./jsx";

// Prop keys consumed by codegen (not emitted as JSX attributes on the
// underlying element). Anything else passes through to the rendered tag.
const COMMON_SKIP = new Set([
  "className",
  "label",
  "tone",
  "size",
  "weight",
  "align",
  "width",
  "padding",
  "radius",
  "shadow",
  "justify",
]);

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
  const inputCls = buildClassName(stringProp(node.props, "className"));
  const inputAttrs = renderProps(node.props, skip());
  const labelLine = label
    ? `${indent(level + 1)}<Label htmlFor=${jsxAttrString(id)}>${label}</Label>\n`
    : "";
  return [
    `${indent(level)}<div className="flex flex-col gap-2">\n`,
    labelLine,
    `${indent(level + 1)}<Input id=${jsxAttrString(id)}${inputAttrs}${classAttr(inputCls)} />\n`,
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
  const inputCls = buildClassName(stringProp(node.props, "className"));
  const inputAttrs = renderProps(node.props, skip());
  const labelLine = label
    ? `${indent(level + 1)}<Label htmlFor=${jsxAttrString(id)}>${label}</Label>\n`
    : "";
  return [
    `${indent(level)}<div className="flex flex-col gap-2">\n`,
    labelLine,
    `${indent(level + 1)}<Textarea id=${jsxAttrString(id)}${inputAttrs}${classAttr(inputCls)} />\n`,
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
  const inputCls = buildClassName(stringProp(node.props, "className"));
  const inputAttrs = renderProps(node.props, skip());
  const labelLine = label
    ? `${indent(level + 1)}<Label htmlFor=${jsxAttrString(id)}>${label}</Label>\n`
    : "";
  return [
    `${indent(level)}<div className="flex items-center gap-2">\n`,
    `${indent(level + 1)}<Switch id=${jsxAttrString(id)}${inputAttrs}${classAttr(inputCls)} />\n`,
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
  if (action) {
    ctx.actionsUsed.add(action);
  }
  const cls = buildClassName(
    classFromMap(node.props.width, WIDTH),
    stringProp(node.props, "className")
  );
  const attrs = renderProps(node.props, skip("action"));
  const handler = action ? ` onClick={() => actions.${action}()}` : "";
  const childText = renderInline(node.children);
  return `${indent(level)}<Button${attrs}${classAttr(cls)}${handler}>${childText}</Button>`;
}

function renderBadge(
  node: ComponentNode,
  _ctx: CodegenContext,
  level: number
): string {
  const cls = buildClassName(stringProp(node.props, "className"));
  const attrs = renderProps(node.props, skip());
  const childText = renderInline(node.children);
  return `${indent(level)}<Badge${attrs}${classAttr(cls)}>${childText}</Badge>`;
}

function renderText(
  node: ComponentNode,
  ctx: CodegenContext,
  level: number
): string {
  const cls = buildClassName(
    classFromMap(node.props.tone, TEXT_TONE),
    classFromMap(node.props.size, TEXT_SIZE),
    classFromMap(node.props.weight, TEXT_WEIGHT),
    classFromMap(node.props.align, TEXT_ALIGN),
    stringProp(node.props, "className")
  );
  const childText = renderInlineWithTracking(node.children, ctx);
  return `${indent(level)}<p${classAttr(cls)}>${childText}</p>`;
}

function renderGeneric(
  node: ComponentNode,
  ctx: CodegenContext,
  level: number
): string {
  const cls = buildClassName(stringProp(node.props, "className"));
  const attrs = renderProps(node.props, skip());
  const childText = renderInlineWithTracking(node.children, ctx);
  if (childText.length === 0) {
    return `${indent(level)}<${node.name}${attrs}${classAttr(cls)} />`;
  }
  return `${indent(level)}<${node.name}${attrs}${classAttr(cls)}>${childText}</${node.name}>`;
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

// Build a per-render skip set: the common style-prop names plus any extras
// the caller wants to omit (e.g. Button's `action`).
function skip(...extra: string[]): Set<string> {
  const out = new Set(COMMON_SKIP);
  for (const e of extra) {
    out.add(e);
  }
  return out;
}
