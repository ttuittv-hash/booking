// 신청서(대관) 이벤트 → 신청자 알림톡.
//
// 신청서 라우트들은 이미 신청서에 매인 인앱 알림(createNotification, quoteId·링크 포함)을
// 만들고 있다. 여기서는 그 위에 알림톡(RT-xx)만 얹는다 — 인앱을 두 번 만들지 않게 inApp:false.
// 발송 실패는 본 업무(계약 확정 등)를 되돌리지 않는다(dispatchMessageInBackground).

import { findUserById } from "@/lib/db";
import { dispatchMessageInBackground } from "./dispatch";

export type QuoteEventTemplate =
  | "RT-01" // 신청 접수
  | "RT-02" // 심사 결과
  | "RT-03" // 계약금액 확정
  | "RT-04" // 계약서 날인 요청
  | "RT-05" // 세금계산서 발행
  | "RT-06" // 입금 확인
  | "RT-07" // 보증금 입금 확인
  | "RT-08" // 최종 정산금액 확정
  | "RT-09"; // 부속합의 등록

export function notifyQuoteApplicant(input: {
  templateCode: QuoteEventTemplate;
  quoteId: string;
  applicantId: string;
  /** 같은 이벤트가 두 번 처리돼도 한 번만 나가게 하는 꼬리표(예: 세금계산서 종류). 없으면 신청서당 1회. */
  eventKey?: string;
  variables: Record<string, string>;
  request?: Request;
}): void {
  void (async () => {
    const applicant = await findUserById(input.applicantId);
    if (!applicant) return;
    dispatchMessageInBackground({
      templateCode: input.templateCode,
      idempotencyKey: `${input.templateCode}:${input.quoteId}${input.eventKey ? `:${input.eventKey}` : ""}`,
      recipient: { userId: applicant.id, phone: applicant.phone, email: applicant.email, name: applicant.name },
      variables: { 신청자명: applicant.name, 신청번호: input.quoteId, ...input.variables },
      request: input.request,
      inApp: false,
    });
  })().catch((error) => console.error("[message] 신청서 알림 실패", input.templateCode, input.quoteId, error));
}

/** 금액 표기 — 알림톡 본문은 "#{금액}원" 이라 숫자만 콤마로 넣는다. */
export function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString("ko-KR");
}
