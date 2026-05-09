import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
    vite: "src/vite.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  // The Vite plugin and CLI both depend on `vite` types only — vite itself
  // is a peer dep at runtime, so don't bundle it.
  external: ["vite"],
});
