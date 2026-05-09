import type { BlockNode, SectionNode } from "../ast/types";
import type { CodegenContext } from "./context";
import { indent, renderInline } from "./jsx";
import { renderComponent } from "./render-component";
import { renderDirective } from "./render-directive";

// Render an array of block nodes; each is rendered on its own line.
export function renderBlocks(
  blocks: BlockNode[],
  ctx: CodegenContext,
  level: number
): string {
  if (blocks.length === 0) {
    return "";
  }
  return blocks.map((b) => renderBlock(b, ctx, level)).join("\n");
}

export function renderBlock(
  block: BlockNode,
  ctx: CodegenContext,
  level: number
): string {
  switch (block.type) {
    case "section":
      return renderSection(block, ctx, level);
    case "directive":
      return renderDirective(block, ctx, level, renderBlocks);
    case "component":
      return renderComponent(block, ctx, level);
    case "paragraph": {
      const text = renderInline(block.children);
      return `${indent(level)}<p>${text}</p>`;
    }
    default:
      return "";
  }
}

// A SectionNode renders its title + children. Special case: if the section's
// only structural child is a single @card directive, hoist the section title
// into the card's CardTitle. This is the natural-feeling "## Profile" → Card
// title pairing the user expects.
function renderSection(
  node: SectionNode,
  ctx: CodegenContext,
  level: number
): string {
  const onlyChild = node.children.length === 1 ? node.children[0] : undefined;
  if (onlyChild && onlyChild.type === "directive" && onlyChild.name === "card") {
    return renderDirective(onlyChild, ctx, level, renderBlocks, node.title);
  }
  // Default rendering: heading + children.
  const tag = `h${Math.min(Math.max(node.level, 1), 6)}`;
  const headingClass = headingClassFor(node.level);
  const inner = renderBlocks(node.children, ctx, level);
  return [
    `${indent(level)}<${tag}${headingClass}>${node.title}</${tag}>`,
    inner,
  ]
    .filter((s) => s.length > 0)
    .join("\n");
}

function headingClassFor(level: number): string {
  if (level === 1) {
    return ' className="text-3xl font-semibold"';
  }
  if (level === 2) {
    return ' className="text-xl font-semibold"';
  }
  return "";
}
