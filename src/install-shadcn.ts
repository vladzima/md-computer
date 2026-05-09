// JIT shadcn primitive installer used by both the CLI and the Vite plugin.
// Walks a small set of common locations to decide whether each requested
// primitive is already present, and shells out to `npx shadcn@latest add` for
// any that aren't.

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Names already verified during this process — keeps repeated transforms cheap.
const seen = new Set<string>();

export interface InstallShadcnOptions {
  components: string[];
  cwd: string;
  // Optional logger. Default: process.stdout.
  log?: (msg: string) => void;
  // When true, silently no-op if `components.json` is missing.
  // When false, throws so the caller can surface a clear error.
  skipIfNoConfig?: boolean;
}

export async function installMissingShadcn(
  opts: InstallShadcnOptions
): Promise<void> {
  const log = opts.log ?? ((m) => process.stdout.write(`${m}\n`));
  const componentsJson = resolve(opts.cwd, "components.json");
  if (!existsSync(componentsJson)) {
    if (opts.skipIfNoConfig) {
      return;
    }
    throw new Error(
      `md-computer: no components.json at ${opts.cwd}. Run \`npx shadcn@latest init\` first, or pass --no-install-shadcn to skip.`
    );
  }
  const missing = opts.components.filter(
    (name) => !(seen.has(name) || isInstalled(opts.cwd, name))
  );
  if (missing.length === 0) {
    return;
  }
  log(`md-computer: installing shadcn components: ${missing.join(", ")}`);
  await execFileAsync("npx", ["shadcn@latest", "add", "--yes", ...missing], {
    cwd: opts.cwd,
  });
  for (const name of missing) {
    seen.add(name);
  }
}

function isInstalled(cwd: string, name: string): boolean {
  const candidates = [
    resolve(cwd, "components", "ui", `${name}.tsx`),
    resolve(cwd, "components", "ui", `${name}.ts`),
    resolve(cwd, "src", "components", "ui", `${name}.tsx`),
    resolve(cwd, "src", "components", "ui", `${name}.ts`),
  ];
  const found = candidates.some((p) => existsSync(p));
  if (found) {
    seen.add(name);
  }
  return found;
}
