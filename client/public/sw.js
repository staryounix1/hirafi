// ── Service Worker: قشرة التطبيق بلا إنترنت + إشعارات push ────────────────────
// الاستراتيجية:
//   • التنقّل (HTML)  → network-first مع رجوع للقشرة المخزّنة (التطبيق كيتحمّل بلا نت).
//   • أصول البناء     → cache-first (الملفات فيها hash فالاسم، فتخزينها آمن).
//   • /trpc و /api    → ما كنخزّنوهاش أبداً (معطيات حيّة، وخاصها تكون طازجة).
// الإشعارات: push → عرض إشعار؛ والكليك كيحلّ الرابط المرسل فالبيانات.

const VERSION = "hirafi-v1";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const SHELL_URLS = ["/", "/dashboard", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // كل رابط بوحدو: فشل واحد ما كيوقفش التثبيت كامل.
      await Promise.allSettled(SHELL_URLS.map((u) => cache.add(new Request(u, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isApi(url) {
  return url.pathname.startsWith("/trpc") || url.pathname.startsWith("/api") || url.pathname.startsWith("/app-storage");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isApi(url)) return; // المعطيات الحيّة ما كتخزّنش أبداً

  // التنقّل: شبكة أولاً، وإلا القشرة المخزّنة.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL);
          cache.put("/", fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(SHELL);
          return (await cache.match("/")) ?? (await cache.match("/dashboard")) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // الأصول: من الكاش أولاً، وإلا الشبكة (ومن بعد نخزّنوها).
  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSETS);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const fresh = await fetch(req);
        if (fresh.ok && fresh.type === "basic") cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        return hit ?? Response.error();
      }
    })(),
  );
});

// ── إشعارات الدفع ─────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "حِرْفي", body: event.data ? event.data.text() : "عندك جديد" };
  }
  const title = payload.title || "حِرْفي";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "rtl",
    lang: "ar",
    tag: payload.tag || "hirafi",
    renotify: true,
    data: { url: payload.url || "/notifications" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
