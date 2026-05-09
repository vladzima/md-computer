// Vite plugin: transforms `.md` files into compiled React components.
// Markdown source becomes the .tsx output of `compile()` so any module that
// imports a `.md` file gets the generated component as its default export.
//
// HMR works automatically: editing a `.md` triggers Vite's normal module
// invalidation and the component re-renders.

import type { Plugin } from "vite";
import { compile, deriveComponentName } from "./compile";
import type { Registry } from "./registry/types";

export interface MdUiPluginOptions {
  // Module specifier the generated code uses for the actions sibling.
  // Defaults to `./<filename>.actions` resolved from the .md location.
  actionsModulePath?: (mdPath: string) => string;
  // Override the component registry. Defaults to the built-in set.
  registry?: Registry;
}

export default function markdownComputer(opts: MdUiPluginOptions = {}): Plugin {
  return {
    name: "markdown-computer",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".md")) {
        return null;
      }
      const componentName = deriveComponentName(id);
      const actionsModulePath =
        opts.actionsModulePath?.(id) ?? `./${baseName(id, ".md")}.actions`;
      const result = compile({
        source: code,
        componentName,
        registry: opts.registry,
        actionsModulePath,
      });
      // Treat the result as JSX so Vite's downstream React plugin transforms it.
      return {
        code: result.tsx,
        map: null,
      };
    },
  };
}

function baseName(p: string, ext: string): string {
  const slash = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  const file = slash >= 0 ? p.slice(slash + 1) : p;
  return file.endsWith(ext) ? file.slice(0, -ext.length) : file;
}
