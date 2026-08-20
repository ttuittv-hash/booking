import type { Quote } from "@/lib/pricing/types";

/* ============================================================================
   신청 상태 라벨 — 목록과 상세가 같은 문자열을 쓴다.

   재구성 이전에는 목록이 `예상견적 (심사 대기)`, 상세가 `신청 접수 (예상 견적)` 로
   **같은 상태를 다르게 불렀다.** 라벨은 여기 한 곳에서만 정한다.

   `계약 확정` 이라는 이름은 쓰지 않는다. 승인과 확정을 한 단어에 담아
   "심사 승인만으로는 일정이 확정되지 않는다" 는 구분을 지우기 때문이다.

   ⚠️ 상태 체계 확장(10단: 심사 중 · 자료 보완 요청 · 승인 · 반려 · 계약 진행 중 …)은
   9/1 대관오픈 범위다. 현재 DB 는 ESTIMATE / CONTRACTED / SETTLED 3단이며,
   심사 결과 3종(승인·보류·반려)을 신청자 화면에 표시하려면 상태 컬럼 확장이 먼저 필요하다.
   ========================================================================= */

export const QUOTE_STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "신청 접수 (심사 대기)",
  CONTRACTED: "대관 확정",
  SETTLED: "정산 완료",
};

/**
 * 상태 배지 아래 한 줄. 상태만 보여 주면 대관사가 무엇을 기다려야 하는지 알 수 없다.
 */
export const QUOTE_STATUS_NEXT: Record<Quote["status"], string> = {
  ESTIMATE: "심사 결과가 나오면 이 화면과 이메일로 알려 드립니다.",
  CONTRACTED: "티켓 오픈일을 등록하고 홍보·판매 자료를 올려 주세요.",
  SETTLED: "하실 일이 없습니다. 대관 절차가 종료되었습니다.",
};

export const QUOTE_STATUS_TONE: Record<Quote["status"], "warn" | "accent" | "good"> = {
  ESTIMATE: "warn",
  CONTRACTED: "accent",
  SETTLED: "good",
};
