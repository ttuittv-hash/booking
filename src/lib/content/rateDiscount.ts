/**
 * 대관료 카드의 할인 표시 (2026-09-03 팀 요청).
 *
 * 대관료 페이지는 운영자가 넣은 문자열("518,000,000원", "303,840,000원/일당")을 그대로 보여 준다.
 * 할인율만 따로 받아, 문자열 안의 첫 금액을 읽어 할인가를 만든다 — 접미사(원, /일당)는 그대로 둔다.
 * 숫자를 못 읽으면 null 을 돌려 호출부가 예전처럼 한 줄로 보여 준다.
 */
export interface DiscountedPrice {
  /** 운영자가 넣은 원문 그대로 */
  original: string;
  /** 정수 % (1~99) */
  percent: number;
  /** 할인 적용 금액 문자열 — 원문의 접두·접미사 유지 */
  discounted: string;
}

const AMOUNT_RE = /\d{1,3}(?:,\d{3})+|\d+/;

export function normalizeDiscountPercent(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isFinite(n)) return undefined;
  const r = Math.round(n);
  return r >= 1 && r <= 99 ? r : undefined;
}

export function applyDiscount(original: string, percent: number | undefined | null): DiscountedPrice | null {
  const p = normalizeDiscountPercent(percent);
  if (!p) return null;
  const m = AMOUNT_RE.exec(original);
  if (!m) return null;
  const amount = Number(m[0].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const discountedAmount = Math.round(amount * (1 - p / 100));
  const discounted = original.slice(0, m.index) + discountedAmount.toLocaleString("ko-KR") + original.slice(m.index + m[0].length);
  return { original, percent: p, discounted };
}
