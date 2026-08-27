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
