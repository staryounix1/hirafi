// ── إشعارات الويب (Web Push) — إرسال بلا مكتبات خارجية ────────────────────────
// RFC 8291 (aes128gcm) + RFC 8292 (VAPID) مبنيّين فوق crypto ديال Node.
// علاش بلا مكتبة: حزمة serverless خاصها تكون صغيرة، و`web-push` كتجرّ معاها
// تبعيات كثيرة. هاد التنفيذ كافي لحالتنا: payload صغير JSON.
import crypto from "node:crypto";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/** يبني ترويسة VAPID (JWT موقّع بـES256) لجمهور معيّن. */
function vapidHeaders(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string,
): Record<string, string> {
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = b64url(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: subject,
    }),
  );
  const signingInput = `${header}.${payload}`;

  // المفتاح الخاص الخام (d) كيرجع لمفتاح EC عبر بناء JWK.
  const pub = fromB64url(publicKey); // 65 بايت: 0x04 || X || Y
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: b64url(fromB64url(privateKey)),
    x: b64url(pub.subarray(1, 33)),
    y: b64url(pub.subarray(33, 65)),
  };
  const key = crypto.createPrivateKey({ key: jwk, format: "jwk" });
  const sig = crypto.sign("sha256", Buffer.from(signingInput), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return {
    authorization: `vapid t=${signingInput}.${b64url(sig)}, k=${publicKey}`,
  };
}

/** يشفّر الـpayload حسب RFC 8291 (aes128gcm). */
function encryptPayload(payload: Buffer, p256dh: string, authSecret: string) {
  const uaPublic = fromB64url(p256dh); // مفتاح المتصفح العام
  const auth = fromB64url(authSecret);

  const asKeys = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const asPublic = asKeys.publicKey.export({ format: "jwk" });
  const asPublicRaw = Buffer.concat([
    Buffer.from([4]),
    fromB64url(asPublic.x!),
    fromB64url(asPublic.y!),
  ]);

  // ECDH(as, ua) → shared secret
  const uaKey = crypto.createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: b64url(uaPublic.subarray(1, 33)),
      y: b64url(uaPublic.subarray(33, 65)),
    },
    format: "jwk",
  });
  const shared = crypto.diffieHellman({ privateKey: asKeys.privateKey, publicKey: uaKey });

  const salt = crypto.randomBytes(16);
  const info = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    uaPublic,
    asPublicRaw,
  ]);
  const prk = crypto.createHmac("sha256", auth).update(shared).digest();
  const ikm = crypto.createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest();

  const keyInfo = Buffer.concat([
    Buffer.from("Content-Encoding: aes128gcm\0"),
    Buffer.from([1]),
  ]);
  const nonceInfo = Buffer.concat([
    Buffer.from("Content-Encoding: nonce\0"),
    Buffer.from([1]),
  ]);
  const prk2 = crypto.createHmac("sha256", salt).update(ikm).digest();
  const cek = crypto.createHmac("sha256", prk2).update(keyInfo).digest().subarray(0, 16);
  const nonce = crypto.createHmac("sha256", prk2).update(nonceInfo).digest().subarray(0, 12);

  // سجل واحد: delimiter + body + padding
  const record = Buffer.concat([payload, Buffer.from([2])]);
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(record), cipher.final(), cipher.getAuthTag()]);

  // ترويسة aes128gcm: salt(16) || rs(4) || idlen(1) || keyid(as_public)
  const header = Buffer.concat([
    salt,
    Buffer.from([0, 0, 16, 0]), // rs = 4096
    Buffer.from([asPublicRaw.length]),
    asPublicRaw,
  ]);

  return Buffer.concat([header, ciphertext]);
}

/** كيرسل إشعاراً واحداً. كيرجّع true إلا وصل، و"gone" إلا كان الاشتراك ميّت. */
export async function sendPush(
  target: PushTarget,
  payload: Record<string, unknown>,
): Promise<"ok" | "gone" | "failed"> {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@hirfi.ma";
  if (!publicKey || !privateKey) return "failed";

  let audience: string;
  try {
    audience = new URL(target.endpoint).origin;
  } catch {
    return "gone";
  }

  try {
    const body = encryptPayload(Buffer.from(JSON.stringify(payload), "utf8"), target.p256dh, target.auth);
    const headers = {
      ...vapidHeaders(audience, subject, publicKey, privateKey),
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: "86400",
      urgency: "normal",
    };
    const res = await fetch(target.endpoint, {
      method: "POST",
      headers,
      body: new Uint8Array(body),
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

/** كيولّد زوج مفاتيح VAPID (يُستعمل مرة وحدة، وقت الإعداد). */
export function generateVapidKeys() {
  const keys = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = keys.publicKey.export({ format: "jwk" });
  const pub = Buffer.concat([Buffer.from([4]), fromB64url(jwk.x!), fromB64url(jwk.y!)]);
  const priv = keys.privateKey.export({ format: "jwk" });
  return { publicKey: b64url(pub), privateKey: priv.d! };
}
