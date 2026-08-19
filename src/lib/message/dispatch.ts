// 발송 파이프라인 (기획서 B1의 8단계).
//
//   ① 이벤트 발생 → ② 발송 조건 판정 → ③ 수신자 결정 → ④ 템플릿·변수 바인딩
//   → ⑤ 유형 판정 → ⑥ 발송·결과 수신 → ⑦ 실패 시 대체발송 → ⑧ 이력·반복 예약
//
// 화면 이벤트가 아니라 서버 상태 변화에 붙인다. 화면을 아무도 열지 않으면
// 알림이 누락되는 문제가 예전에 실제로 있었다(AGENTS.md 참고).

import crypto from "node:crypto";
import {
  findSendByIdempotencyKey,
  recordSendAttempt,
  updateSendResult,
} from "@/lib/db";
import { audienceOrigin } from "@/lib/publicUrl";
import { inAppAdapter } from "./inapp";
import { kakaoBizTalkAdapter } from "./kakaoBizTalk";
import { renderTemplate, findTemplate, TemplateVariableError } from "./templates";
import type { ChannelAdapter, SendRequest, SendResult } from "./types";

/**
 * 채널 우선순위.
 * 알림톡이 설정되면 그것이 주 채널이 되고, 아직 키가 없으면 인앱만 나간다.
 * 어느 경우든 인앱은 항상 함께 남긴다(기획서 1-62).
 */
function primaryAdapters(): ChannelAdapter[] {
  return [kakaoBizTalkAdapter].filter((a) => a.isConfigured());
}

export interface DispatchInput {
  templateCode: string;
  /** 같은 이벤트가 두 번 처리돼도 한 번만 나가게 하는 키(기획서 1-57). */
  idempotencyKey: string;
  recipient: SendRequest["recipient"];
  variables?: Record<string, string>;
  /**
   * 버튼 URL 을 만들 때 쓰는 요청.
   * 링크 호스트는 템플릿의 audience(신청자/운영자)로 정해진다 — 보내는 쪽 호스트를
   * 그대로 쓰면 운영자가 승인했다는 이유로 신청자에게 bo 주소가 나간다.
   */
  request?: Request;
}

export interface DispatchOutcome {
  skipped?: "DUPLICATE" | "TEMPLATE_DISABLED";
  results: SendResult[];
}

/**
 * 한 이벤트를 발송한다.
 * 실패해도 예외를 던지지 않는다 — 알림 실패로 본 업무(가입 승인 등)가 되돌아가면 안 된다.
 */
export async function dispatchMessage(input: DispatchInput): Promise<DispatchOutcome> {
  // ② 중복 발송 차단. 배치 재실행·재시도에서 같은 메시지가 두 번 가는 것이 가장 흔한 사고다.
  if (await findSendByIdempotencyKey(input.idempotencyKey)) {
    return { skipped: "DUPLICATE", results: [] };
  }

  const def = findTemplate(input.templateCode);
  if (!def) return { skipped: "TEMPLATE_DISABLED", results: [] };

  const sendId = crypto.randomUUID();
  const variables = { ...(input.variables ?? {}), __sendId: sendId };

  // ④ 변수 바인딩 — 누락이면 발송하지 않고 오류로 남긴다.
  let body: string;
  try {
    body = renderTemplate(input.templateCode, variables);
  } catch (error) {
    await recordSendAttempt({
      id: sendId,
      idempotencyKey: input.idempotencyKey,
      templateCode: input.templateCode,
      recipientId: input.recipient.userId,
      recipientPhone: input.recipient.phone,
      channel: "INAPP",
      status: "FAILED",
      resultCode: "TEMPLATE",
      resultMessage: error instanceof TemplateVariableError ? error.message : "템플릿 오류",
      payloadJson: JSON.stringify(variables),
      createdAt: new Date().toISOString(),
    });
    return { results: [{ ok: false, channel: "INAPP", failure: "TEMPLATE" }] };
  }

  const request: SendRequest = {
    templateCode: input.templateCode,
    body,
    recipient: input.recipient,
    variables,
    button: def.button
      ? {
          name: def.button.name,
          url: input.request
            ? `${audienceOrigin(input.request, def.audience)}${def.button.path}`
            : def.button.path,
        }
      : null,
  };

  const results: SendResult[] = [];

  // ⑥ 주 채널 발송 (설정된 것이 없으면 건너뛴다)
  for (const adapter of primaryAdapters()) {
    await recordSendAttempt({
      id: sendId,
      idempotencyKey: input.idempotencyKey,
      templateCode: input.templateCode,
      recipientId: input.recipient.userId,
      recipientPhone: input.recipient.phone,
      channel: adapter.channel,
      status: "QUEUED",
      payloadJson: JSON.stringify(variables),
      createdAt: new Date().toISOString(),
    });
    const result = await adapter.send(request);
    results.push(result);
    await updateSendResult(sendId, {
      status: result.ok ? "SENT" : "FAILED",
      resultCode: result.resultCode ?? null,
      resultMessage: result.resultMessage ?? null,
      sentAt: result.ok ? new Date().toISOString() : null,
    });
    // ⑦ 도달 불가(미가입·차단·수신거부)는 문자 대체발송 대상이다.
    //    LMS 계약이 아직 없어 지금은 인앱으로만 떨어진다.
    if (!result.ok && result.failure === "UNREACHABLE") {
      results.push({ ok: false, channel: "LMS", failure: "UNREACHABLE", resultMessage: "LMS 미설정" });
    }
  }

  // 인앱은 항상 남긴다. 위에서 이미 기록한 sendId 와 겹치지 않게 별도 행으로 남긴다.
  const inAppId = crypto.randomUUID();
  await recordSendAttempt({
    id: inAppId,
    idempotencyKey: `${input.idempotencyKey}:INAPP`,
    templateCode: input.templateCode,
    recipientId: input.recipient.userId,
    recipientPhone: input.recipient.phone,
    channel: "INAPP",
    status: "QUEUED",
    payloadJson: JSON.stringify(variables),
    createdAt: new Date().toISOString(),
  });
  const inApp = await inAppAdapter.send(request);
  results.push(inApp);
  await updateSendResult(inAppId, {
    status: inApp.ok ? "SENT" : "FAILED",
    resultCode: inApp.resultCode ?? null,
    resultMessage: inApp.resultMessage ?? null,
    sentAt: inApp.ok ? new Date().toISOString() : null,
  });

  return { results };
}
