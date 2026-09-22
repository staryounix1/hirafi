// Vercel serverless entrypoint.
//
// The app's real server (server/_core/index.ts) calls `serve({...})` to bind a
// port, which is wrong for a serverless function: Vercel hands us a Node
// (req, res) pair instead. So this file re-exports the SAME Hono app without
// listening. Keep every route/middleware in sync with server/_core/index.ts —
// this is only the transport adapter, never a second source of truth.
import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { serveAppStorage } from "../server/_core/storage";
import { getJob } from "../server/_core/jobs";
import { mountClient } from "../server/_core/serve";
import { handle } from "hono/vercel";

const app = new Hono().basePath("/").onError((err, c) => {
  console.error("[server] unhandled", err);
  return c.json({ error: "internal error" }, 500);
});

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

export default handle(app);
