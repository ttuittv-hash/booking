import type { Quote } from "@/lib/pricing/types";

/* ============================================================================
   신청 상태 라벨 — 목록과 상세가 같은 문자열을 쓴다.

   재구성 이전에는 목록이 `예상견적 (심사 대기)`, 상세가 `신청 접수 (예상 견적)` 로
   같은 상태를 다르게 불렀다. 라벨은 여기 한 곳에서만 정한다.

   ⚠️ Notion 이 정의한 상태 체계는 10단(신청 접수 · 심사 중 · 자료 보완 요청 · 승인 ·
   반려 · 계약 진행 중 · 대관 확정 · 공연 준비 · 정산 대기 · 정산 완료)이다.
   현재 DB 의 `quotes.status` 는 ESTIMATE / CONTRACTED / SETTLED 3단이므로, 아래는
   3단을 Notion 어휘로 옮긴 것이다. 심사 결과 3종(승인·보류·반려)을 신청자 화면에
   표시하려면 상태 컬럼 확장과 운영자 심사 화면 작업이 먼저 필요하다.
   ========================================================================= */

export const QUOTE_STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "신청 접수 (심사 대기)",
  CONTRACTED: "대관 확정",
  SETTLED: "정산 완료",
};

export const QUOTE_STATUS_TONE: Record<Quote["status"], "warn" | "accent" | "good"> = {
  ESTIMATE: "warn",
  CONTRACTED: "accent",
  SETTLED: "good",
};

// [신규 2026-09-17] "보류 누르면 마이페이지 리스트에서 상태값이 보류로 노출돼야" — status
// 컬럼(ESTIMATE/CONTRACTED/SETTLED)만으로는 보류를 구분 못 한다(위 Notion 10단 코멘트
// 참고). review.decision === HOLD 인 동안만 별도 라벨/톤으로 덮어써 신청자 화면에
// 보여준다. 목록·상세 화면이 이 두 함수 하나씩만 쓰도록(QUOTE_STATUS_LABEL 직접
// 참조 금지) 한다 — 안 그러면 "보류인데 심사 대기로 보인다" 류의 불일치가 다시 생긴다.
//
// [수정 2026-09-18] 거절(REJECTED)도 같은 문제였다 — 관리자 목록에는 "심사 거절"
// 뱃지가 뜨는데 신청자 화면은 여기서 HOLD만 갈라 보여서 거절된 신청서도 계속
// "신청 접수 (심사 대기)"로 보였다. 거절은 보류와 달리 신청자가 더 손댈 수 없는
// 상태라(canApplicantEditQuote) "거절됨"만 알리고 끝 — 재신청은 새 신청서로 한다.
export function applicantQuoteStatusLabel(quote: Pick<Quote, "status" | "review">): string {
  if (quote.status === "ESTIMATE" && quote.review?.decision === "HOLD") {
    return "보류 (보완 요청)";
  }
  if (quote.status === "ESTIMATE" && quote.review?.decision === "REJECTED") {
    return "거절됨";
  }
  return QUOTE_STATUS_LABEL[quote.status];
}

export function applicantQuoteStatusTone(
  quote: Pick<Quote, "status" | "review">,
): "warn" | "accent" | "good" | "danger" {
  if (quote.status === "ESTIMATE" && quote.review?.decision === "HOLD") {
    return "danger";
  }
  if (quote.status === "ESTIMATE" && quote.review?.decision === "REJECTED") {
    return "danger";
  }
  return QUOTE_STATUS_TONE[quote.status];
}

// [신규 2026-09-08] "대관 접수 후 24시간 동안은 수정 버튼 노출, 그 이후로는 삭제" —
// 접수 직후 짧은 오탈자 정정 창구는 열어 두되, 시간이 지나면 심사 시작 여부와 무관하게
// 신청자가 직접 못 고치게 한다(운영자를 통해서만). 기존 "심사 시작 전(ESTIMATE)·review
// 기록 없음" 조건에 시간 조건을 더한다 — 셋 다 만족해야 한다.
//
// [수정 2026-09-17] "보류 누르면 수정 버튼이 노출돼야" — 보류(HOLD)는 "이대로는 승인 못
// 하니 보완해서 다시 내라"는 뜻이라, 승인·거절과 달리 신청자가 고칠 길이 있어야
// 의미가 있다. 24시간 창과 별개로(심사가 그 창을 넘겨 끝나는 게 보통이라) 보류인 동안은
// 항상 수정을 허용한다 — 승인/거절처럼 심사가 "끝난" 상태와 구분해서 본다.
export const APPLICANT_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function canApplicantEditQuote(quote: Pick<Quote, "status" | "review" | "createdAt">): boolean {
  if (quote.status !== "ESTIMATE") return false;
  if (quote.review?.decision === "HOLD") return true;
  if (quote.review) return false;
  return Date.now() - new Date(quote.createdAt).getTime() < APPLICANT_EDIT_WINDOW_MS;
}
