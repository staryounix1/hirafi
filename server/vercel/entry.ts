// Vercel Node (serverless) entrypoint.
//
// The app's real server (server/_core/index.ts) calls `serve({...})`, binding a
// port — wrong for a serverless function, where Vercel hands us a Node
// IncomingMessage/ServerResponse pair instead. This file mounts the SAME Hono
// app (same routers, same middleware) and bridges Node <-> Fetch here, so the
// business code stays the single source of truth.
//
// NOTE: `hono/vercel`'s handle() expects a Web `Request`, which is what Vercel
// passes only to *Edge* functions. A Node runtime function gets (req, res), so
// that adapter silently produces a non-function handler and the invocation
// fails. Hence the explicit bridge below.
import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { serveAppStorage } from "../_core/storage";
import { getJob } from "../_core/jobs";
import { mountClient } from "../_core/serve";

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext(c),
  }),
);

app.all("/app-storage/*", (c) => serveAppStorage(c));

app.post("/api/_jobs/:name", async (c) => {
  const signature = c.req.header("x-platform-signature");
  if (!signature) {
    return c.text("unauthorized (job callback signature required)", 401);
  }
  const handler = getJob(c.req.param("name"));
  if (!handler) return c.text("no such job", 404);
  try {
    await handler();
    return c.json({ ok: true });
  } catch (err) {
    console.error(`[jobs] "${c.req.param("name")}" failed`, err);
    return c.text("job failed", 500);
  }
});

// Serve the built SPA + index.html fallback from dist/public.
mountClient(app);

/** Build a Web Request from Vercel's Node request. */
async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const url = new URL(req.url ?? "/", `${proto}://${host}`);

  const method = req.method ?? "GET";
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) for (const item of v) headers.append(k, item);
    else headers.set(k, v);
  }

  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const buf = Buffer.concat(chunks);
    // Copy into a plain ArrayBuffer: Buffer's underlying storage is
    // ArrayBufferLike (could be SharedArrayBuffer), which BodyInit rejects.
    if (buf.length) body = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }

  return new Request(url, { method, headers, body });
}

/**
 * Vercel-facing entry. Wraps the real bridge so a boot/invocation failure surfaces
 * as readable text instead of a bare FUNCTION_INVOCATION_FAILED (the platform
 * gives no runtime logs on this plan).
 */
export default async function __entry(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await handler(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end("INVOKE ERROR:\n" + (err instanceof Error ? err.stack : String(err)));
  }
}

async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const response = await app.fetch(await toWebRequest(req));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      // set-cookie can repeat; append the rest.
      if (key.toLowerCase() === "set-cookie") res.appendHeader(key, value);
      else res.setHeader(key, value);
    });
    const buf = Buffer.from(await response.arrayBuffer());
    res.setHeader("content-length", String(buf.byteLength));
    res.end(buf);
  } catch (err) {
    console.error("[vercel] invocation failed", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end("internal error");
  }
}
