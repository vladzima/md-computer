// Single high-level entry point used by both the CLI and the Vite plugin.
// Reads a .md source string, returns the .tsx output and the metadata the
// caller needs to (a) write a sibling actions stub and (b) JIT install
// shadcn primitives.

import { type GenerateResult, generate } from "./codegen";
import { generateActionsStub } from "./codegen/actions-stub";
import { buildAst } from "./parser/build-ast";
import { BUILTIN_REGISTRY } from "./registry/builtin";
import type { Registry } from "./registry/types";

const PATH_SEPARATOR_RE = /[\\/]/;
const MD_EXT_RE = /\.md$/i;
const PAGE_SUFFIX_RE = /Page$/;
const CAMEL_BOUNDARY_RE = /([a-z0-9])([A-Z])/g;
const NON_ALNUM_RE = /[^a-zA-Z0-9]+/;

export interface CompileOptions {
  actionsModulePath?: string;
  componentName: string;
  registry?: Registry;
  source: string;
}

export type CompileResult = GenerateResult & {
  actionsStub: string;
};

export function compile(opts: CompileOptions): CompileResult {
  const registry = opts.registry ?? BUILTIN_REGISTRY;
  const ast = buildAst(opts.source, registry);
  const gen = generate(ast, {
    registry,
    componentName: opts.componentName,
    actionsModulePath: opts.actionsModulePath,
  });
  const actionsStub = generateActionsStub({
    actionsUsed: gen.actionsUsed,
    bindingsUsed: gen.bindingsUsed,
  });
  return { ...gen, actionsStub };
}

// Derive a React component name from a source path.
// `app/settings/page.md` -> `SettingsPage`
// `pricing.md` -> `PricingPage`
// `index.md` (in /foo) -> `FooPage`
export function deriveComponentName(filePath: string): string {
  const segments = filePath.split(PATH_SEPARATOR_RE).filter(Boolean);
  const file = segments.at(-1) ?? "page.md";
  const parent = segments.at(-2);
  const baseRaw = file.replace(MD_EXT_RE, "");
  const base =
    baseRaw === "page" || baseRaw === "index" ? (parent ?? "page") : baseRaw;
  const pascal = pascalCase(base);
  return PAGE_SUFFIX_RE.test(pascal) ? pascal : `${pascal}Page`;
}

function pascalCase(s: string): string {
  // Split on non-alphanumeric AND on lower→Upper boundaries so `PricingPage`
  // round-trips correctly instead of becoming `Pricingpage`.
  return s
    .replace(CAMEL_BOUNDARY_RE, "$1 $2")
    .split(NON_ALNUM_RE)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}
