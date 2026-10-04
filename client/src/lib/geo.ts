// ── الموقع الجغرافي: تقريبي عبر IP (بلا إذن) + دقيق عبر GPS (بإذن) ────────────
//
// مبدأ صارم: **ما كان تتبّع خفي.** المصادر:
//   1) IP  → مدينة تقريبية بلا أي إذن (من رؤوس Vercel عبر config.geo). كافية
//      لنتعبّيو المدينة افتراضياً ولنرتّبو الخدمات تقريبياً.
//   2) GPS → إحداثيات دقيقة، **بإذن صريح** فقط (navigator.geolocation). المتصفح
//      هو اللي كيسول، وما يمكنش نتجاوزو.
//
// النتيجة كتتخزّن فـlocalStorage باش ما نعاودوش نسولو فكل صفحة.
import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/_core/trpc";
import type { MoroccanCity } from "@shared/constants";

const STORAGE_KEY = "hirafi.geo.v1";
/** مدة صلاحية التخزين: 12 ساعة (الزائر يقدر يتنقّل). */
const TTL_MS = 12 * 60 * 60 * 1000;

export type GeoCoords = { lat: number; lng: number; accuracy?: number };

export type GeoState = {
  /** المدينة: من الملف الشخصي إن كان مسجّلاً، وإلا من IP. */
  city: MoroccanCity | null;
  /** منين جا الموقع حالياً. */
  source: "profile" | "ip" | "gps" | null;
  /** إحداثيات GPS الدقيقة (بإذن فقط)، أو تقريبية من IP. */
  coords: GeoCoords | null;
  /** واش الإحداثيات دقيقة (GPS) ولا تقريبية (IP)؟ */
  precise: boolean;
  /** المدينة الخام كما رجعت من Vercel (للتشخيص). */
  rawCity: string | null;
};

type Cached = {
  ts: number;
  city: MoroccanCity | null;
  rawCity: string | null;
  coords: GeoCoords | null;
  precise: boolean;
};

function readCache(): Cached | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.ts || Date.now() - parsed.ts > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(c: Cached) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    // التخزين معطّل (تصفّح خاص) — نتجاهلو بلا مشكل.
  }
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * موقع الزائر: تقريبي بـIP فوراً (بلا إذن)، ومن بعد دقيق بـGPS إلا سمح الزائر.
 *
 * - `requestGps()` كتطلب الإذن صراحة (خاص تتناد من فعل ديال الزائر — زر مثلاً،
 *   ماشي أوتوماتيك، حيت المتصفحات كتحجب الطلب الأوتوماتيكي).
 * - المدينة من الملف الشخصي (إلا كان مسجّل) عندها الأولوية على الـIP.
 */
export function useGeo(opts?: { autoGps?: boolean }) {
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [state, setState] = useState<GeoState>({
    city: cached?.city ?? null,
    source: cached?.city ? (cached.precise ? "gps" : "ip") : null,
    coords: cached?.coords ?? null,
    precise: cached?.precise ?? false,
    rawCity: cached?.rawCity ?? null,
  });
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // 1) تقريبي من IP — بلا إذن، مرة واحدة (الكاش كيمنع التكرار).
  const ipQ = trpc.config.geo.useQuery(undefined, { staleTime: TTL_MS, enabled: !cached });

  useEffect(() => {
    const g = ipQ.data;
    if (!g) return;
    // ما نطغاوش على موقع GPS أدق إلا كان محفوظ.
    setState((prev) => {
      if (prev.precise && prev.coords) return prev;
      const next: GeoState = {
        city: (g.city as MoroccanCity | null) ?? prev.city,
        source: prev.city ? prev.source : g.city ? "ip" : prev.source,
        coords: prev.coords ?? (g.lat !== null && g.lng !== null ? { lat: g.lat, lng: g.lng } : null),
        precise: prev.precise,
        rawCity: g.rawCity,
      };
      writeCache({
        ts: Date.now(),
        city: next.city,
        rawCity: next.rawCity,
        coords: next.coords,
        precise: next.precise,
      });
      return next;
    });
  }, [ipQ.data]);

  // 2) GPS بإذن — غير إلا طلبو الزائر (أو autoGps وكان الإذن مسبقاً).
  const requestGps = useCallback(async (): Promise<GeoCoords | null> => {
    if (!isGeolocationSupported()) {
      setGpsError("المتصفح ما كيدعمش تحديد الموقع");
      return null;
    }
    setGpsBusy(true);
    setGpsError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 10_000,
        }),
      );
      const coords: GeoCoords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setState((prev) => {
        const next: GeoState = { ...prev, coords, precise: true, source: "gps" };
        writeCache({ ts: Date.now(), city: next.city, rawCity: next.rawCity, coords, precise: true });
        return next;
      });
      return coords;
    } catch (e) {
      const err = e as GeolocationPositionError;
      setGpsError(
        err?.code === err?.PERMISSION_DENIED
          ? "رفضت الإذن بالموقع — كنقدّرو نعتمدو على المدينة"
          : "تعذّر تحديد موقعك الدقيق",
      );
      return null;
    } finally {
      setGpsBusy(false);
    }
  }, []);

  // إلا كان الإذن مسبقاً "granted"، نجيبو GPS أوتوماتيك بلا ما نسولوا.
  useEffect(() => {
    if (!opts?.autoGps) return;
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    let cancelled = false;
    void navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        if (!cancelled && p.state === "granted") void requestGps();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [opts?.autoGps, requestGps]);

  return { ...state, gpsBusy, gpsError, requestGps, isLoading: ipQ.isLoading };
}

/** مسافة هافرساين بالكيلومتر — لحساب القرب بين إحداثيتين. */
export function haversineKm(a: GeoCoords, b: GeoCoords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
