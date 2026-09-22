// Bundle the Vercel serverless handler to plain ESM JavaScript.
//
// Why bundle at all: @vercel/node's own transpile of the TypeScript entry resolves
// this app's extensionless TS imports ("../routers") inconsistently, so the deployed
// export was never the handler.
// Why ESM: package.json is "type":"module", so a CJS bundle (`module.exports`)
// throws "module is not defined in ES module scope" the moment Vercel imports it.
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["server/vercel/entry.ts"],
  bundle: true,
  platform: "node",
  packages: "external",
  format: "esm",
  outfile: "api/handler.js",
  logLevel: "info",
});
