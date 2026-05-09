// biome-ignore-all lint/performance/noBarrelFile: this is the package's public API surface.
export type {
  BlockNode,
  ComponentNode,
  DirectiveNode,
  PageNode,
  ParagraphNode,
  Props,
  SectionNode,
} from "./ast/types";
export type { GenerateOptions, GenerateResult } from "./codegen";
export { generate } from "./codegen";
export { generateActionsStub } from "./codegen/actions-stub";
export type { CompileOptions, CompileResult } from "./compile";
export { compile, deriveComponentName } from "./compile";
export { buildAst } from "./parser/build-ast";
export { BUILTIN_REGISTRY } from "./registry/builtin";
export type { ComponentEntry, ImportSpec, Registry } from "./registry/types";
