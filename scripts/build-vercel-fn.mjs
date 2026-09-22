// Pre-bundle the Vercel serverless entry to plain JavaScript.
//
// Two constraints shape this:
//  1. api/index.ts left to @vercel/node resolved the app's extensionless TS
//     imports inconsistently, so the deployed export was not the handler.
//  2. package.json has "type":"module", so ANY .js file in this project is
//     loaded as ESM. esbuild's `format:"cjs"` output starts with
//     `module.exports = ...`, which throws `module is not defined in ES module
//     scope` at import time — the real cause of FUNCTION_INVOCATION_FAILED.
//
// So emit real ESM and give it a default export. Vercel's Node runtime accepts
// an ESM default-exported handler.
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
