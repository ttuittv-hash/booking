// 발송 결과 대사(對査) — 파이프라인 ⑥ "결과 수신".
//
// 알림톡·문자는 접수 응답(code 100)만 동기로 오고, 실제 카카오/통신사 결과는 DKT 에 쌓였다가
// 폴링으로 받아 온다. 받은 결과를 message_sends 에 반영하고 반드시 완료 처리(PUT)해야
// 같은 결과가 다시 내려오지 않는다.
//
// cid 는 우리 sendId 다(kakaoBizTalk.requestCid). 그래서 결과의 cid 로 행을 바로 찾는다.

import { updateSendResult } from "@/lib/db";
import { completePoll, isBizTalkConfigured, pollMessageResults, type PolledResult } from "./kakaoBizTalk";

export interface ReconcileSummary {
  polled: number;
  sent: number;
  failed: number;
  completed: boolean;
}

/** DKT 상태코드 → 우리 이력 상태. API_200 만 성공, 나머지는 실패(사유는 kko/sms 코드). */
export function mapPolledStatus(r: PolledResult): { status: "SENT" | "FAILED"; code: string | null; message: string | null } {
  const ok = r.stateCode === "API_200" || r.stateCode === "200";
  return {
    status: ok ? "SENT" : "FAILED",
    code: r.stateCode ?? null,
    message: r.message ?? null,
  };
}

let running = false;

export async function reconcileMessageResults(): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { polled: 0, sent: 0, failed: 0, completed: false };
  if (!isBizTalkConfigured() || running) return summary;
  running = true;
  try {
    const batch = await pollMessageResults();
    summary.polled = batch.results.length;
    for (const r of batch.results) {
      if (!r.cid) continue;
      const mapped = mapPolledStatus(r);
      // 우리 sendId 가 아닌 cid(수동 테스트 등)는 UPDATE 0건으로 조용히 지나간다.
      await updateSendResult(r.cid, {
        status: mapped.status,
        resultCode: mapped.code,
        resultMessage: mapped.message,
        sentAt: mapped.status === "SENT" ? new Date().toISOString() : null,
      });
      if (mapped.status === "SENT") summary.sent += 1;
      else summary.failed += 1;
    }
    if (batch.reportGroupNumber && batch.results.length > 0) {
      summary.completed = await completePoll(batch.reportGroupNumber);
    }
  } catch (error) {
    console.error("[message] 결과 대사 실패", error);
  } finally {
    running = false;
  }
  return summary;
}

/**
 * 접수 직후 잠시 뒤 결과를 받아 온다. 카카오 결과는 보통 수 초 안에 확정된다.
 * 응답을 막지 않으며, 프로세스 종료도 막지 않는다(unref).
 */
export function scheduleReconcile(delayMs = 10_000): void {
  const timer = setTimeout(() => {
    void reconcileMessageResults();
  }, delayMs);
  timer.unref?.();
}
