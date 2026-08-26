// [신규 2026-08-26] "동일 기간 내 다른 대관사 비교" 슬롯에서 표와 AI 추천 프롬프트가
// 똑같은 모양의 데이터를 쓰므로 한 곳에서만 만든다 — admin/[id]/page.tsx(표 렌더링)와
// api/admin/quotes/[id]/ai-compare/route.ts(AI 프롬프트)가 이 함수를 공유한다.
import type { AppUser, Quote } from "@/lib/pricing/types";
import { DEFAULT_VENUE_ID, VENUES } from "@/lib/pricing/types";
import { scoreQuote } from "./scoreQuote";

export interface CompetingCandidateFacts {
  quoteId: string;
  companyName: string | null;
  venueLabel: string;
  statusLabel: string; // "심사대기" | "승인" | "보류" | "거절" | "계약 확정" | "정산 확정"
  isCurrent: boolean; // 지금 보고 있는 신청서인지
  provisionalScore: number; // scoreQuote 잠정 합계(동시대관이면 두 공간 합)
  eligible: boolean; // 60점 잠정 적격 여부(전 공간 충족 시 true)
  unresolvedMax: number; // 아직 산정 안 된 배점(신뢰도 낮을수록 큼)
  expectedAudience: number;
  total: number;
}

function venueLabel(quote: Quote): string {
  if (quote.selection.bookingMode === "SIMULTANEOUS") return "동시 대관(아레나+중형공연장)";
  if (quote.selection.venueId === "medium-hall") return "중형공연장";
  return VENUES.find((v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "아레나";
}

function statusLabel(quote: Quote): string {
  if (quote.status === "CONTRACTED") return "계약 확정";
  if (quote.status === "SETTLED") return "정산 확정";
  if (!quote.review) return "심사대기";
  return { APPROVED: "승인", HOLD: "보류", REJECTED: "거절" }[quote.review.decision];
}

export function buildCandidateFacts(
  quote: Quote,
  applicant: AppUser | null | undefined,
  isCurrent: boolean,
): CompetingCandidateFacts {
  const breakdown = scoreQuote(quote.selection);
  const provisionalScore = breakdown.results.reduce((sum, r) => sum + r.provisionalFinal, 0);
  const unresolvedMax = breakdown.results.reduce((sum, r) => sum + r.unresolvedMax, 0);
  const eligible = breakdown.results.every((r) => r.provisionalEligible);
  return {
    quoteId: quote.id,
    companyName: applicant?.companyName ?? null,
    venueLabel: venueLabel(quote),
    statusLabel: statusLabel(quote),
    isCurrent,
    provisionalScore,
    eligible,
    unresolvedMax,
    expectedAudience: quote.selection.expectedAudience,
    total: quote.total,
  };
}
