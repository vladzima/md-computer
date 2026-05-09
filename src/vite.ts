// Vite plugin: transforms `.md` files into compiled React components and
// JIT-installs any missing shadcn primitives the page references.
//
// - `enforce: "pre"` so we run before Vite's default static-asset handling
// - `transformWithEsbuild` turns the compiled JSX into JS with the automatic
//   JSX runtime so consumers don't need a custom React plugin pipeline
// - shadcn primitives are installed once per process; HMR triggers re-transform
//   but the in-process cache means the install isn't repeated.

import { type Plugin, transformWithEsbuild } from "vite";
import { compile, deriveComponentName } from "./compile";
import { installMissingShadcn } from "./install-shadcn";
import type { Registry } from "./registry/types";

const MD_EXT = ".md";

export interface MdComputerPluginOptions {
  // Module specifier the generated code uses for the actions sibling.
  // Defaults to `./<filename>.actions` resolved from the .md location.
  actionsModulePath?: (mdPath: string) => string;
  // JIT install missing shadcn primitives on first transform. Default true.
  // Set false if your project already vendors them or you prefer to manage by hand.
  installShadcn?: boolean;
  // Override the component registry. Defaults to the built-in set.
  registry?: Registry;
}

export default function mdComputer(opts: MdComputerPluginOptions = {}): Plugin {
  let projectRoot = process.cwd();

  return {
    name: "md-computer",
    enforce: "pre",
    configResolved(config) {
      projectRoot = config.root;
    },
    async transform(code, id) {
      const cleanId = stripQuery(id);
      if (!cleanId.endsWith(MD_EXT)) {
        return null;
      }
      const componentName = deriveComponentName(cleanId);
      const actionsModulePath =
        opts.actionsModulePath?.(cleanId) ??
        `./${baseName(cleanId, MD_EXT)}.actions`;
      const result = compile({
        source: code,
        componentName,
        registry: opts.registry,
        actionsModulePath,
      });

      if (opts.installShadcn !== false && result.shadcnComponents.length > 0) {
        await installMissingShadcn({
          components: result.shadcnComponents,
          cwd: projectRoot,
          // In dev we don't want to crash the server if components.json is
          // absent — leave the import unresolved and let Vite surface that.
          skipIfNoConfig: true,
        });
      }

      // Convert JSX → JS so the browser can evaluate the module without a
      // separate React plugin pass.
      const transformed = await transformWithEsbuild(result.tsx, cleanId, {
        loader: "tsx",
        jsx: "automatic",
        sourcemap: true,
      });
      return { code: transformed.code, map: transformed.map };
    },
  };
}

function stripQuery(id: string): string {
  const q = id.indexOf("?");
  return q >= 0 ? id.slice(0, q) : id;
}

function baseName(p: string, ext: string): string {
  const slash = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  const file = slash >= 0 ? p.slice(slash + 1) : p;
  return file.endsWith(ext) ? file.slice(0, -ext.length) : file;
}
