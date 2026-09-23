// The generated file is checked in because Vercel discovers function paths
// before running the build. Bundle the handler so Vercel does not need to
// transpile the app's extensionless TypeScript imports itself.
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["server/vercel/entry.ts"],
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
