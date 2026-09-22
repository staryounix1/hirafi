import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Dev model (DESIGN §5.1 / M1): Vite serves the SPA on PORT (default 3000) with
// native HMR; API calls to /trpc and /app-storage are proxied to the Hono API
// process (dev:api on API_PORT, default 3001). In prod there is NO Vite — the
// single Hono process (dist/index.js) serves the built client from dist/public
// AND the API. Keeping runtime fs to that one prod shim (server/_core/serve.ts)
// is what keeps the template edge-portable (§5.7.3).
//
// base: '/' — the template ASSUMES a per-app origin at the root path. It does
// NOT support being mounted under a shared-host path prefix (DESIGN §5.1 / #13).
const WEB_PORT = Number(process.env.PORT ?? 3000);
const API_PORT = Number(process.env.API_PORT ?? 3001);
const apiProxy = { target: `http://localhost:${API_PORT}`, changeOrigin: true };

export default defineConfig({
  base: "/",
  // Tailwind v4 runs as a Vite plugin (no tailwind.config / postcss / autoprefixer);
  // it auto-detects content, theme tokens live in client/src/index.css (@theme).
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  server: {
    port: WEB_PORT,
    host: true,
    proxy: {
      "/trpc": apiProxy,
      "/app-storage": apiProxy,
      "/api": apiProxy,
    },
  },
  build: {
    // Client build lands in dist/public; the prod server serves it statically.
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
