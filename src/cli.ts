#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import cac from "cac";
import { compile, deriveComponentName } from "./compile";

const MD_EXT_RE = /\.md$/i;

const cli = cac("md-ui");

cli
  .command("compile <input>", "Compile a .md file to a .tsx React component")
  .option("--out <path>", "Output .tsx path (defaults to sibling file)")
  .option("--actions-out <path>", "Output for the actions stub")
  .option(
    "--install-shadcn",
    "Run `npx shadcn add` for any shadcn components referenced but not yet installed",
    { default: false }
  )
  .option("--cwd <path>", "Project root for shadcn install (default: cwd)")
  .action((input: string, opts: CompileOpts) => runCompile(input, opts));

cli.help();
cli.version("0.0.0");
cli.parse();

interface CompileOpts {
  actionsOut?: string;
  cwd?: string;
  installShadcn?: boolean;
  out?: string;
}

function runCompile(input: string, opts: CompileOpts): void {
  const inputPath = isAbsolute(input) ? input : resolve(input);
  if (!existsSync(inputPath)) {
    process.stderr.write(`md-ui: input not found: ${inputPath}\n`);
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
      `md-ui: keeping existing ${rel(actionsOutPath)} (compiler never overwrites this file)\n`
    );
  } else {
    ensureDir(actionsOutPath);
    writeFileSync(actionsOutPath, result.actionsStub, "utf8");
    process.stdout.write(`md-ui: wrote ${rel(actionsOutPath)} (stub)\n`);
  }

  process.stdout.write(`md-ui: wrote ${rel(outPath)}\n`);

  if (opts.installShadcn && result.shadcnComponents.length > 0) {
    installShadcnComponents(result.shadcnComponents, opts.cwd ?? process.cwd());
  }
}

function installShadcnComponents(components: string[], cwd: string): void {
  const componentsJson = resolve(cwd, "components.json");
  if (!existsSync(componentsJson)) {
    process.stderr.write(
      `md-ui: --install-shadcn requested but no components.json at ${cwd}; skipping install\n`
    );
    return;
  }
  const missing = components.filter((name) => {
    const candidates = [
      resolve(cwd, "components", "ui", `${name}.tsx`),
      resolve(cwd, "components", "ui", `${name}.ts`),
      resolve(cwd, "src", "components", "ui", `${name}.tsx`),
      resolve(cwd, "src", "components", "ui", `${name}.ts`),
    ];
    return !candidates.some((p) => existsSync(p));
  });
  if (missing.length === 0) {
    return;
  }
  process.stdout.write(
    `md-ui: installing missing shadcn components: ${missing.join(", ")}\n`
  );
  execFileSync("npx", ["shadcn@latest", "add", ...missing], {
    cwd,
    stdio: "inherit",
  });
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
