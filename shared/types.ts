import type { UserRole } from "./constants";

// The identity contract every AuthProvider yields (DESIGN §5.1). Business code
// depends ONLY on this shape — never on HOW the user authenticated. NOTE: no
// password_hash / provider-internal fields here on purpose.
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

/** رقم الهاتف المغربي (تقريبي): 10 أرقام تبدأ بـ 0). */
const PHONE_RE = /^0[5-7]\d{8}$/;
export function isValidMoroccanPhone(v: string): boolean {
  return PHONE_RE.test(v.replace(/[\s-]/g, ""));
}

export function formatMAD(amount: number): string {
  return `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(amount)} درهم`;
}
