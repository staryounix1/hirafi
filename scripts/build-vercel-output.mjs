// Emit Vercel's Build Output API v3 layout (.vercel/output).
//
// Why not api/*.ts / the `hono` preset: the preset's detection produced 0 outputs
// on every attempt, so nothing was routable, and api/index.ts could not resolve
// its "../server/**" imports at runtime (Vercel ships only what the function file
// itself pulls in, not the TypeScript sources).
//
// Writing .vercel/output ourselves is the deterministic route: we control exactly
// which files exist, what the entry is, and which paths route to the function.
//
//   .vercel/output/config.json          routing
//   .vercel/output/functions/api.func/  the lambda (index.mjs + its node_modules)
//   .vercel/output/static/              prerendered client assets
import * as esbuild from "esbuild";
import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const OUT = ".vercel/output";
const FUNC = `${OUT}/functions/api.func`;

await rm(OUT, { recursive: true, force: true });
await mkdir(FUNC, { recursive: true });
await mkdir(`${OUT}/static`, { recursive: true });

// 1. Bundle the serverless entry into one ESM file. Dependencies are bundled in
//    (packages:"bundle"): leaving them external relied on the deployed function's
//    node_modules, which was not reliably populated.
await esbuild.build({
  entryPoints: ["server/vercel/entry.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: `${FUNC}/index.mjs`,
  logLevel: "info",
  banner: {
    // pg and friends are CommonJS and call require() internally; esbuild's ESM
    // output needs a real require for those paths.
    js: [
      'import { createRequire as __cr } from "node:module";',
      "const require = __cr(import.meta.url);",
    ].join("\n"),
  },
});

// 2. The client build (vite -> dist/public) must sit INSIDE the function package
//    as dist/public, because _core/serve.ts resolves "./dist/public" relative to
//    the function's working directory. Also copy it to static/ so plain asset
//    requests are served straight from the CDN without waking the lambda.
if (!existsSync("dist/public")) {
  throw new Error("dist/public missing — run build:web first");
}
await cp("dist/public", `${FUNC}/dist/public`, { recursive: true });
await cp("dist/public", `${OUT}/static`, { recursive: true });

// 3. Function manifest. includeFiles is not needed: mountClient reads the SPA
//    from dist/public, which we place in static/ and serve via the filesystem
//    route below, so the ESM bundle itself only needs its own code.
await writeFile(
  `${FUNC}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
    },
    null,
    2,
  ),
);

// 4. Routing: API + storage + jobs go to the function; everything else is static,
//    falling back to the SPA's index.html for client-side routes.
const config = {
  version: 3,
  routes: [
    { src: "/api/(.*)", dest: "/api" },
    { src: "/trpc/(.*)", dest: "/api" },
    { src: "/app-storage/(.*)", dest: "/api" },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ],
};
await writeFile(`${OUT}/config.json`, JSON.stringify(config, null, 2));

console.log("Build Output API written to", OUT);
