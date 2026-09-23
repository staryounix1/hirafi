// Bundle the Vercel handler before deployment so Vercel does not need to
// transpile the app's extensionless TypeScript imports itself.
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["api/index.ts"],
  bundle: true,
  platform: "node",
  packages: "external",
  format: "esm",
  target: "node20",
  outfile: "api/index.js",
  logLevel: "info",
  banner: {
    js: [
      'import { createRequire as __cr } from "node:module";',
      "const require = __cr(import.meta.url);",
    ].join("\n"),
  },
});
