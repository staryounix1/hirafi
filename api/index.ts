// Vercel entry for the `hono` preset.
//
// The preset looks for a default-exported request handler in api/. We wrap the
// real handler so a startup/invocation failure is reported as text rather than
// an opaque FUNCTION_INVOCATION_FAILED — the platform otherwise swallows the
// error and gives no logs.
import type { IncomingMessage, ServerResponse } from "node:http";

let inner: ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | null = null;
let bootError: string | null = null;

try {
  const mod = await import("../server/vercel/entry");
  inner = (mod.default ?? mod.handler) as typeof inner;
  if (typeof inner !== "function") {
    bootError = `entry module did not export a function; keys=${Object.keys(mod).join(",")}`;
  }
} catch (err) {
  bootError = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (bootError) {
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(`BOOT ERROR:\n${bootError}`);
    return;
  }
  try {
    await inner!(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end(`INVOKE ERROR:\n${err instanceof Error ? `${err.message}\n${err.stack}` : String(err)}`);
  }
}
