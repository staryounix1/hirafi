// ── خريطة «حِرْفي» — خريطة ويب تفاعلية مع احتياط بصري ──────────────────────────
// الخريطة الحقيقية تستعمل بلاطات OpenStreetMap، مع دبابيس ومسار فوقها.
// تبقى لوحة SVG كاحتياط إذا انقطع تحميل مكتبة الخريطة أو الشبكة.
//
// كل الدبابيس تُوضع بنسب مئوية داخل حاوية نسبية، فتتكيّف مع أي مقاس.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MapPinSpec {
  id: string;
  /** الإحداثي الأفقي 0–100 (%). */
  x: number;
  /** الإحداثي الرأسي 0–100 (%). */
  y: number;
  /** إحداثيات حقيقية اختيارية للخريطة التفاعلية. */
  lat?: number;
  lng?: number;
  /** حرف يظهر داخل الدبوس (اسم مقدّم الخدمة مثلاً). */
  label?: string;
  kind?: "provider" | "request" | "me";
}

/** مسار متقطّع يشبه مسار inDrive بين الالتقاط والوصول. */
const ROUTE_PATH =
  "M 62 245 C 96 232 118 196 150 188 C 186 179 208 152 232 130 C 258 106 288 96 318 78 C 336 66 352 58 366 46";

type MapCanvasProps = {
  pins?: MapPinSpec[];
  showRoute?: boolean;
  height?: number | string;
  className?: string;
  children?: ReactNode;
  dim?: boolean;
};

type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  setLatLng?: (position: [number, number]) => LeafletLayer;
};
type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  invalidateSize: () => void;
  remove: () => void;
};
type LeafletApi = {
  map: (container: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => LeafletLayer;
  marker: (position: [number, number], options?: Record<string, unknown>) => LeafletLayer;
  divIcon: (options: Record<string, unknown>) => unknown;
  polyline: (positions: [number, number][], options?: Record<string, unknown>) => LeafletLayer;
};

declare global {
  interface Window {
    L?: LeafletApi;
  }
}

const MAP_CENTER: [number, number] = [33.5731, -7.5898];
const LEAFLET_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function loadLeaflet(): Promise<LeafletApi> {
  if (typeof window !== "undefined" && window.L) return Promise.resolve(window.L);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-leaflet]");
    const script = existing ?? document.createElement("script");

    const finish = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet لم يتم تحميله"));
    };

    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("تعذر تحميل الخريطة")), { once: true });

    if (!existing) {
      script.dataset.leaflet = "true";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

function pinPosition(pin: MapPinSpec): [number, number] {
  if (pin.lat !== undefined && pin.lng !== undefined) return [pin.lat, pin.lng];
  return [MAP_CENTER[0] + (50 - pin.y) * 0.0012, MAP_CENTER[1] + (pin.x - 50) * 0.0016];
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export function MapCanvas({
  pins = [],
  showRoute = false,
  height = 260,
  className,
  children,
  dim = false,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const locationMarkerRef = useRef<LeafletLayer | null>(null);
  const pinSignature = pins.map((pin) => `${pin.id}:${pin.x}:${pin.y}:${pin.lat ?? ""}:${pin.lng ?? ""}`).join("|");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationError("الموقع غير متاح فهاد الجهاز");
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const map = mapRef.current;
        const L = window.L;
        if (!map || !L) {
          setLocationError("الخريطة مازال كتوجد");
          setIsLocating(false);
          return;
        }

        const position: [number, number] = [coords.latitude, coords.longitude];
        if (locationMarkerRef.current) {
          locationMarkerRef.current.setLatLng?.(position);
        } else {
          const icon = L.divIcon({
            className: "hirfi-leaflet-pin",
            html: '<span class="hirfi-map-pin hirfi-map-pin--location">●</span>',
            iconSize: [38, 44],
            iconAnchor: [19, 22],
          });
          locationMarkerRef.current = L.marker(position, { icon }).addTo(map);
        }

        map.setView(position, 15);
        setIsLocating(false);
      },
      () => {
        setLocationError("سمح لينا بالوصول لموقعك باش نحددو بلاصتك");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    async function renderMap() {
      try {
        const L = await loadLeaflet();
        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current, { zoomControl: false }).setView(MAP_CENTER, 12);
        L.tileLayer(LEAFLET_TILE_URL, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        pins.forEach((pin) => {
          const kind = pin.kind === "me" ? "me" : pin.kind === "request" ? "request" : "provider";
          const label = pin.kind === "me" ? "●" : escapeHtml((pin.label ?? "").trim().charAt(0));
          const icon = L.divIcon({
            className: "hirfi-leaflet-pin",
            html: `<span class="hirfi-map-pin hirfi-map-pin--${kind}">${label}</span>`,
            iconSize: [38, 44],
            iconAnchor: [19, 22],
          });
          L.marker(pinPosition(pin), { icon }).addTo(map);
        });

        const start = pins.find((pin) => pin.kind === "me");
        const end = pins.find((pin) => pin.kind === "request");
        if (showRoute && start && end) {
          L.polyline([pinPosition(start), pinPosition(end)], {
            color: "#111315",
            weight: 5,
            opacity: 0.85,
            dashArray: "9 11",
          }).addTo(map);
        }

      mapRef.current = map;
      locationMarkerRef.current = null;
      setStatus("ready");
        window.setTimeout(() => map.invalidateSize(), 0);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void renderMap();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      locationMarkerRef.current = null;
    };
  }, [pinSignature, showRoute]);

  return (
    <div
      className={cn("relative overflow-hidden bg-map-bg", className)}
      style={{ height }}
      role="application"
      aria-label="خريطة الحرّافين"
    >
      {status !== "ready" ? <StaticMapFallback pins={pins} showRoute={showRoute} height="100%" /> : null}
      <div ref={containerRef} className={cn("hirfi-leaflet absolute inset-0", status !== "ready" && "opacity-0")} />
      {dim ? <div className="absolute inset-0 z-[400] bg-foreground/10" /> : null}
      {status === "loading" ? (
        <div className="absolute inset-x-0 top-3 z-[500] text-center text-[11px] font-bold text-muted-foreground">
          جارٍ تحميل الخريطة…
        </div>
      ) : null}
      <button
        type="button"
        onClick={locateUser}
        disabled={isLocating}
        className="absolute start-3 top-16 z-[500] inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-black text-brand-ink shadow-lg transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
        aria-label="موقعي"
      >
        <LocateFixed className={cn("size-4", isLocating && "animate-pulse")} aria-hidden="true" />
        <span>موقعي</span>
      </button>
      {locationError ? (
        <div className="absolute start-3 top-[7.25rem] z-[500] max-w-[210px] rounded-xl bg-card px-3 py-2 text-[10px] font-bold text-destructive shadow-lg">
          {locationError}
        </div>
      ) : null}

      {children}
    </div>
  );
}

function StaticMapFallback({
  pins = [],
  showRoute = false,
  height = 260,
}: Pick<MapCanvasProps, "pins" | "showRoute" | "height">) {
  return (
    <div className="absolute inset-0 bg-map-bg" style={{ height }} aria-hidden="true">
      <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <g fill="var(--map-block)">
          <rect x="14" y="16" width="90" height="60" rx="7" />
          <rect x="118" y="16" width="70" height="60" rx="7" />
          <rect x="202" y="16" width="82" height="60" rx="7" />
          <rect x="298" y="16" width="88" height="60" rx="7" />
          <rect x="14" y="88" width="80" height="70" rx="7" />
          <rect x="108" y="88" width="96" height="70" rx="7" />
          <rect x="218" y="88" width="74" height="70" rx="7" />
          <rect x="306" y="88" width="80" height="70" rx="7" />
          <rect x="14" y="182" width="112" height="48" rx="7" />
          <rect x="140" y="182" width="86" height="48" rx="7" />
          <rect x="240" y="182" width="146" height="48" rx="7" />
          <rect x="14" y="244" width="150" height="46" rx="7" />
          <rect x="178" y="244" width="208" height="46" rx="7" />
        </g>
        <rect x="292" y="196" width="94" height="34" rx="10" fill="var(--map-park)" />
        <ellipse cx="66" cy="160" rx="52" ry="24" fill="var(--map-water)" opacity="0.75" />
        <g stroke="var(--map-road)" strokeLinecap="round">
          {[12, 34, 57, 80, 94].map((y) => (
            <line key={`h${y}`} x1="-10" y1={y * 3} x2="410" y2={y * 3} strokeWidth="13" />
          ))}
          {[9, 28, 46, 68, 88].map((x) => (
            <line key={`v${x}`} x1={x * 4} y1="-10" x2={x * 4} y2="310" strokeWidth="11" />
          ))}
          <line x1="-10" y1="300" x2="410" y2="120" strokeWidth="16" />
        </g>
        <g stroke="var(--map-line)" strokeWidth="0.8" opacity="0.55">
          {[12, 34, 57, 80, 94].map((y) => (
            <line key={`hl${y}`} x1="0" y1={y * 3} x2="400" y2={y * 3} strokeDasharray="7 9" />
          ))}
        </g>
        {showRoute ? (
          <>
            <path d={ROUTE_PATH} fill="none" stroke="var(--foreground)" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
            <path d={ROUTE_PATH} fill="none" stroke="var(--map-road)" strokeWidth="2" strokeLinecap="round" strokeDasharray="9 11" />
          </>
        ) : null}
      </svg>
      {pins.map((pin) => (
        <Pin key={pin.id} pin={pin} />
      ))}
    </div>
  );
}

/** دبوس خريطة — دائرة كبيرة بحدّ أبيض وظل، كما يرسم inDrive السيارات والركاب. */
function Pin({ pin }: { pin: MapPinSpec }) {
  const isMe = pin.kind === "me";
  const isRequest = pin.kind === "request";
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
    >
      <span
        className={cn(
          "grid place-items-center rounded-full border-2 border-white font-display text-[11px] font-black shadow-md",
          isMe
            ? "size-9 bg-foreground text-background"
            : isRequest
              ? "size-8 bg-brand text-brand-ink"
              : "size-8 bg-card text-foreground",
        )}
      >
        {isMe ? (
          <svg viewBox="0 0 24 24" className="size-4 fill-current">
            <path d="M12 12.2a4 4 0 100-8 4 4 0 000 8zm0 1.9c-4.1 0-7.4 2.3-7.4 5.1V21h14.8v-1.8c0-2.8-3.3-5.1-7.4-5.1z" />
          </svg>
        ) : (
          (pin.label ?? "").trim().charAt(0) || <span className="size-2 rounded-full bg-current" />
        )}
      </span>
      {/* ذيل الدبوس — يشير إلى النقطة الدقيقة */}
      <span className="absolute left-1/2 top-full size-0 -translate-x-1/2 border-x-[4px] border-t-[6px] border-x-transparent border-t-white/90" />
    </span>
  );
}

/** مؤشّر موقعي «أنت هنا» بنبضة — يستعمل في الشاشات التي لا دبوس لها. */
export function MyLocationPin({ x, y }: { x: number; y: number }) {
  return (
    <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      <span className="hirfi-ping absolute inset-0 -m-2 rounded-full bg-foreground/25" />
      <span className="relative block size-4 rounded-full border-[3px] border-white bg-foreground shadow" />
    </span>
  );
}

/** مقبض سحب الشريحة — ثلاث شرطات، كما في كل شرائح inDrive السفلية. */
export function DragHandle({ className }: { className?: string }) {
  return (
    <span className={cn("mx-auto block h-1.5 w-11 rounded-full bg-border", className)} />
  );
}

/**
 * طبقة شريحة سفلية فوق الخريطة — النمط المركزي في inDrive.
 * تُرسم كطبقة مطلقة أسفل الحاوية النسبية (وليس fixed) كي تبقى داخل عمود التطبيق.
 */
export function MapSheet({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sheet absolute inset-x-0 bottom-0 z-20 px-4 pb-5 pt-3.5",
        className,
      )}
    >
      <DragHandle className="mb-4" />
      {children}
    </div>
  );
}
