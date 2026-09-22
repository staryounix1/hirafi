// ── خريطة «حِرْفي» — لوحة SVG مرسومة يدوياً تحاكي خريطة inDrive ────────────────
// لا خدمة خرائط حقيقية في هذا النطاق (خارج النطاق صراحةً)، لكن الواجهة تحتاج
// «بانر خريطة» بارزاً كما في inDrive: خلفية رمادية فاتحة، طرق بيضاء، كتل بناء،
// حديقة وماء، ثم دبابيس متحرّكة ومسار متقطّع بين نقطتين.
//
// كل الدبابيس تُوضع بنسب مئوية داخل حاوية نسبية، فتتكيّف مع أي مقاس.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MapPinSpec {
  id: string;
  /** الإحداثي الأفقي 0–100 (%). */
  x: number;
  /** الإحداثي الرأسي 0–100 (%). */
  y: number;
  /** حرف يظهر داخل الدبوس (اسم مقدّم الخدمة مثلاً). */
  label?: string;
  kind?: "provider" | "request" | "me";
}

/** طرق الخريطة — ثابتة كي لا تُعاد رسمها بشكل مختلف في كل تصيير. */
const H_ROADS = [12, 34, 57, 80, 94];
const V_ROADS = [9, 28, 46, 68, 88];

/** مسار متقطّع يشبه مسار inDrive بين الالتقاط والوصول. */
const ROUTE_PATH =
  "M 62 245 C 96 232 118 196 150 188 C 186 179 208 152 232 130 C 258 106 288 96 318 78 C 336 66 352 58 366 46";

export function MapCanvas({
  pins = [],
  showRoute = false,
  height = 260,
  className,
  children,
  dim = false,
}: {
  pins?: MapPinSpec[];
  showRoute?: boolean;
  height?: number | string;
  className?: string;
  children?: ReactNode;
  /** تعتيم خفيف يبرز الشريحة البيضاء فوقه — كما في شاشة عرض السعر. */
  dim?: boolean;
}) {
  return (
    <div
      className={cn("relative overflow-hidden bg-map-bg", className)}
      style={{ height }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        {/* الكتل العمرانية */}
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

        {/* حديقة وماء — لمسة واحدة فقط لكل منهما كي لا تصير الخريطة ملوّنة */}
        <rect x="292" y="196" width="94" height="34" rx="10" fill="var(--map-park)" />
        <ellipse cx="66" cy="160" rx="52" ry="24" fill="var(--map-water)" opacity="0.75" />

        {/* الطرق: عريضة بيضاء بلا حدود — نمط خرائط inDrive */}
        <g stroke="var(--map-road)" strokeLinecap="round">
          {H_ROADS.map((y) => (
            <line key={`h${y}`} x1="-10" y1={y * 3} x2="410" y2={y * 3} strokeWidth="13" />
          ))}
          {V_ROADS.map((x) => (
            <line key={`v${x}`} x1={x * 4} y1="-10" x2={x * 4} y2="310" strokeWidth="11" />
          ))}
          {/* طريق رئيسي قطري — يكسر الشبكة المنتظمة */}
          <line x1="-10" y1="300" x2="410" y2="120" strokeWidth="16" />
        </g>

        {/* خطوط رقيقة داخل الطرق */}
        <g stroke="var(--map-line)" strokeWidth="0.8" opacity="0.55">
          {H_ROADS.map((y) => (
            <line
              key={`hl${y}`}
              x1="0"
              y1={y * 3}
              x2="400"
              y2={y * 3}
              strokeDasharray="7 9"
            />
          ))}
        </g>

        {/* المسار بين الطرفين */}
        {showRoute ? (
          <>
            <path
              d={ROUTE_PATH}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d={ROUTE_PATH}
              fill="none"
              stroke="var(--map-road)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="9 11"
            />
          </>
        ) : null}
      </svg>

      {dim ? <div className="absolute inset-0 bg-foreground/10" /> : null}

      {/* الدبابيس */}
      {pins.map((p) => (
        <Pin key={p.id} pin={p} />
      ))}

      {children}
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
