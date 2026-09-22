// Build a self-contained ESM serverless function for Vercel.
//
// Why a bundle and not the raw TS entry: Vercel compiles api/<entry> on its own
// and does NOT ship the rest of the TypeScript sources, so a runtime import of
// "../server/vercel/entry" fails with ERR_MODULE_NOT_FOUND. Bundling pulls the
// whole app (routers, db, storage, jobs) into the single file Vercel deploys;
// third-party packages stay external and come from node_modules.
//
// Why ESM: package.json is "type":"module", so CJS output (`module.exports`)
// throws "module is not defined in ES module scope" at import time.
import * as esbuild from "esbuild";

const OUT = "api/index.mjs";

await esbuild.build({
  entryPoints: ["server/vercel/entry.ts"],
  bundle: true,
  platform: "node",
  packages: "external",
  format: "esm",
  outfile: OUT,
  logLevel: "info",
});
