// Vercel zero-config entry: api/*.mjs becomes a serverless Function.
// The real handler is bundled to ./handler.js by scripts/build-vercel-fn.mjs.
export { default } from "./handler.js";
