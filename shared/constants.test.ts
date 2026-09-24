import { describe, expect, it } from "vitest";
import { PLATFORM_FEE_PERCENT } from "./constants";

// نموذج العمولة: يدفعها الحرّاف من محفظته لحظة قبول عرضه، بنسبة 15% من المبلغ
// المتفق عليه. اختبار النسبة والحساب يثبّت القرار فلا يُغيَّر سهواً في الكود لاحقاً.
describe("عمولة المنصّة", () => {
  it("النسبة المعتمدة 15% (وليس 10%)", () => {
    expect(PLATFORM_FEE_PERCENT).toBe(15);
  });

  it("تُحسَب على المبلغ الكامل وتُقرَّب لأقرب درهم", () => {
    const commission = (amount: number) => Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
    expect(commission(500)).toBe(75); // 500 × 15%
    expect(commission(1000)).toBe(150);
    expect(commission(380)).toBe(57);
    expect(commission(333)).toBe(50); // 49.95 → 50
  });
});
