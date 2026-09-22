// Pre-bundle the Vercel serverless entry to plain ESM JavaScript.
//
// Why: leaving api/index.ts as TypeScript hands it to @vercel/node's own
// transpile pass, which resolves the app's extensionless TS imports ("../server/routers")
// inconsistently and can emit a module whose default export is not the handler.
// Bundling it here makes the deployed artifact plain, explicit JS — the same
// esbuild settings the app's own prod bundle uses (packages external).
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["server/vercel/entry.ts"],
  bundle: true,
  platform: "node",
  packages: "external",
  format: "esm",
  outfile: "api/index.js",
  logLevel: "info",
});
