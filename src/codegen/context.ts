import type { Registry } from "../registry/types";

// Mutable state collected while walking the UI AST.
// At the end of codegen we use this to assemble the final imports block
// and to surface the set of actions/bindings/shadcn deps to the caller.
export type CodegenContext = {
  registry: Registry;
  // module path -> set of named imports
  imports: Map<string, Set<string>>;
  actionsUsed: Set<string>;
  bindingsUsed: Set<string>;
  shadcnComponents: Set<string>; // shadcn primitive names (for JIT install)
  componentName: string;
  actionsModulePath: string;
};

export function createContext(opts: {
  registry: Registry;
  componentName: string;
  actionsModulePath: string;
}): CodegenContext {
  return {
    registry: opts.registry,
    imports: new Map(),
    actionsUsed: new Set(),
    bindingsUsed: new Set(),
    shadcnComponents: new Set(),
    componentName: opts.componentName,
    actionsModulePath: opts.actionsModulePath,
  };
}

export function addImport(
  ctx: CodegenContext,
  from: string,
  named: string[]
): void {
  let bucket = ctx.imports.get(from);
  if (!bucket) {
    bucket = new Set();
    ctx.imports.set(from, bucket);
  }
  for (const n of named) {
    bucket.add(n);
  }
  // shadcn imports come from `@/components/ui/*` — record the basename so the
  // CLI can JIT install them later.
  const shadcnMatch = from.match(/^@\/components\/ui\/([\w-]+)$/);
  if (shadcnMatch && shadcnMatch[1]) {
    ctx.shadcnComponents.add(shadcnMatch[1]);
  }
}

// Bring in the registered imports for a given source name (directive or
// component) if the registry has an entry for it.
export function useRegistryEntry(ctx: CodegenContext, name: string): void {
  const entry = ctx.registry[name];
  if (!entry) {
    return;
  }
  for (const imp of entry.imports) {
    addImport(ctx, imp.from, imp.named);
  }
}
