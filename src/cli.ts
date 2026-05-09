#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import cac from "cac";
import { compile, deriveComponentName } from "./compile";
import { installMissingShadcn } from "./install-shadcn";

const MD_EXT_RE = /\.md$/i;

const cli = cac("md-computer");

cli
  .command("compile <input>", "Compile a .md file to a .tsx React component")
  .option("--out <path>", "Output .tsx path (defaults to sibling file)")
  .option("--actions-out <path>", "Output for the actions stub")
  .option(
    "--no-install-shadcn",
    "Skip auto-installing missing shadcn primitives (default: install them)"
  )
  .option("--cwd <path>", "Project root for shadcn install (default: cwd)")
  .action((input: string, opts: CompileOpts) => runCompile(input, opts));

cli.help();
cli.version("0.2.1");
cli.parse();

interface CompileOpts {
  actionsOut?: string;
  cwd?: string;
  // cac inverts boolean flags prefixed with `--no-` automatically; default true.
  installShadcn?: boolean;
  out?: string;
}

async function runCompile(input: string, opts: CompileOpts): Promise<void> {
  const inputPath = isAbsolute(input) ? input : resolve(input);
  if (!existsSync(inputPath)) {
    process.stderr.write(`md-computer: input not found: ${inputPath}\n`);
    process.exit(1);
  }
  const source = readFileSync(inputPath, "utf8");
  const componentName = deriveComponentName(inputPath);

  const result = compile({ source, componentName });

  const outPath =
    opts.out === undefined
      ? inputPath.replace(MD_EXT_RE, ".tsx")
      : resolveMaybe(opts.out);
  const actionsOutPath =
    opts.actionsOut === undefined
      ? inputPath.replace(MD_EXT_RE, ".actions.ts")
      : resolveMaybe(opts.actionsOut);

  ensureDir(outPath);
  writeFileSync(outPath, result.tsx, "utf8");

  if (existsSync(actionsOutPath)) {
    process.stdout.write(
      `md-computer: keeping existing ${rel(actionsOutPath)} (compiler never overwrites this file)\n`
    );
  } else {
    ensureDir(actionsOutPath);
    writeFileSync(actionsOutPath, result.actionsStub, "utf8");
    process.stdout.write(`md-computer: wrote ${rel(actionsOutPath)} (stub)\n`);
  }

  process.stdout.write(`md-computer: wrote ${rel(outPath)}\n`);

  // JIT install missing shadcn primitives by default.
  if (opts.installShadcn !== false && result.shadcnComponents.length > 0) {
    try {
      await installMissingShadcn({
        components: result.shadcnComponents,
        cwd: opts.cwd ?? process.cwd(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${msg}\n`);
      process.exit(1);
    }
  }
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function rel(p: string): string {
  return p.startsWith(process.cwd()) ? p.slice(process.cwd().length + 1) : p;
}

function resolveMaybe(p: string): string {
  return isAbsolute(p) ? p : resolve(p);
}
