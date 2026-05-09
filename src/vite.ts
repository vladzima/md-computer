// Vite plugin: transforms `.md` files into compiled React components and
// JIT-installs any missing shadcn primitives the page references.
//
// - `enforce: "pre"` so we run before Vite's default static-asset handling
// - `transformWithEsbuild` turns the compiled JSX into JS with the automatic
//   JSX runtime so consumers don't need a custom React plugin pipeline
// - shadcn primitives are installed once per process; HMR triggers re-transform
//   but the in-process cache means the install isn't repeated
// - **Each compiled .tsx is also written to `<projectRoot>/.md-computer/`.**
//   That dir gives Tailwind's source scanner real files to discover the
//   codegen-emitted classes in. Without this, classes that exist only in
//   the in-memory transform output get pruned and silently fail to render.
//   Users add `@source "../.md-computer/**/*.tsx";` to their CSS.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { type Plugin, transformWithEsbuild } from "vite";
import { compile, deriveComponentName } from "./compile";
import { installMissingShadcn } from "./install-shadcn";
import type { Registry } from "./registry/types";

const MD_EXT = ".md";
const CACHE_DIR_NAME = ".md-computer";
const PATH_SEPARATOR_RE = /[/\\]/g;
const MD_EXT_RE = /\.md$/i;

export interface MdComputerPluginOptions {
  // Module specifier the generated code uses for the actions sibling.
  // Defaults to `./<filename>.actions` resolved from the .md location.
  actionsModulePath?: (mdPath: string) => string;
  // Persist the compiled .tsx to `<projectRoot>/<cacheDir>/` so Tailwind's
  // native source scan finds the class strings. Default true. Set false if
  // you prefer to manage class discovery yourself (e.g. via `@source inline`).
  cache?: boolean;
  // Override the cache directory name. Default ".md-computer".
  cacheDir?: string;
  // JIT install missing shadcn primitives on first transform. Default true.
  // Set false if your project already vendors them or you prefer to manage by hand.
  installShadcn?: boolean;
  // Override the component registry. Defaults to the built-in set.
  registry?: Registry;
}

export default function mdComputer(opts: MdComputerPluginOptions = {}): Plugin {
  let projectRoot = process.cwd();
  const cacheDirName = opts.cacheDir ?? CACHE_DIR_NAME;
  const cacheEnabled = opts.cache !== false;

  return {
    name: "md-computer",
    enforce: "pre",
    configResolved(config) {
      projectRoot = config.root;
      if (cacheEnabled) {
        mkdirSync(join(projectRoot, cacheDirName), { recursive: true });
      }
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

      if (cacheEnabled) {
        cacheGeneratedTsx(projectRoot, cacheDirName, cleanId, result.tsx);
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

// Mirror the compiled .tsx into <projectRoot>/<cacheDir>/<mangled>.tsx so
// Tailwind's source scanner finds the class strings. The mangled name is
// the project-relative source path with separators replaced — keeps every
// .md unique without nesting.
function cacheGeneratedTsx(
  projectRoot: string,
  cacheDirName: string,
  mdPath: string,
  tsx: string
): void {
  const cacheDir = join(projectRoot, cacheDirName);
  const rel = relative(projectRoot, mdPath);
  const fileName = rel
    .replace(PATH_SEPARATOR_RE, "__")
    .replace(MD_EXT_RE, ".tsx");
  writeFileSync(join(cacheDir, fileName), tsx, "utf8");
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
