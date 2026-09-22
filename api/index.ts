// Vercel zero-config entry for the `hono` preset.
//
// The preset looks for a Hono app default export. server/vercel/entry.ts already
// exports exactly that (the same routes as the production server, minus the port
// bind), so re-export it here rather than duplicating the wiring.
export { default } from "../server/vercel/entry";
