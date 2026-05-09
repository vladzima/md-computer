// A registry entry tells the codegen how to render a directive or component
// and which shadcn imports it needs.

export interface PropSpec {
  optional?: boolean;
  // For v1, prop validation is permissive. Future: enums, types, required.
  type?: "string" | "number" | "boolean";
}

export interface ImportSpec {
  // Bare import path, e.g. "@/components/ui/button".
  from: string;
  // Named imports to pull from `from`.
  named: string[];
}

export interface ComponentEntry {
  // shadcn imports required when this component is used.
  imports: ImportSpec[];
  // Whether the source uses this as a `@directive` (block wrapper) or
  // a `Component` (leaf invocation). Some entries (like `card`) can serve
  // both — the parser decides based on the source line shape.
  kind: "directive" | "component";
  name: string;
  // Optional prop schema; v1 is permissive but used for docs and stub generation.
  props?: Record<string, PropSpec>;
}

export type Registry = Record<string, ComponentEntry>;
