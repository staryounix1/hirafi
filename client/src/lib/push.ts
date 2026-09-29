// ── إشعارات الهاتف (Web Push) — التسجيل والتفعيل من الواجهة ────────────────────
// ثلاث حالات: مدعوم/غير مدعوم، مسموح/مرفوض، ومشترك/غير مشترك.
// على iOS خاص التطبيق يكون **مثبّت** على الشاشة الرئيسية (iOS 16.4+) — لهذا
// كنكشفو `needsInstall` باش نوضّحو للمستخدم كيفاش يفعّلها.

export type PushState = "unsupported" | "needs-install" | "denied" | "on" | "off";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** واش التطبيق متثبّت على الشاشة الرئيسية؟ (standalone) */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  // iOS: الإشعارات ما كتخدمش إلا فالتطبيق المثبّت.
  if (isIOS() && !isStandalone()) return "needs-install";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

/** كيفعّل الإشعارات: إذن + اشتراك + تسجيل فالخادم. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "المتصفح ما كيدعمش الإشعارات" };
  if (isIOS() && !isStandalone()) {
    return { ok: false, error: "على iPhone: زيد التطبيق للشاشة الرئيسية أولاً" };
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "ما عطيتيش الإذن للإشعارات" };

  const cfg = await fetch("/trpc/config.public?batch=1&input=" + encodeURIComponent(JSON.stringify({ "0": { json: null, meta: { values: ["undefined"], v: 1 } } })), {
    credentials: "include",
  })
    .then((r) => r.json())
    .then((d) => d?.[0]?.result?.data?.json as { vapidPublicKey?: string } | undefined)
    .catch(() => undefined);

  const key = cfg?.vapidPublicKey ?? "";
  if (!key) return { ok: false, error: "الإشعارات ماشي مفعّلة فالخادم" };

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
  });

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const res = await fetch("/trpc/notifications.pushSubscribe?batch=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      "0": {
        json: { endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      },
    }),
  });
  if (!res.ok) return { ok: false, error: "تعذّر تسجيل الجهاز" };
  return { ok: true };
}

/** كيوقف الإشعارات من هاد الجهاز. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {});
  await fetch("/trpc/notifications.pushUnsubscribe?batch=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ "0": { json: { endpoint } } }),
  }).catch(() => {});
}
