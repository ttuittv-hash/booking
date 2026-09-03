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
import { isRecipientAllowed } from "./allowlist";
import { scheduleReconcile } from "./reconcile";
import { resolveKakaoButtonUrl, resolveKakaoTemplateCode } from "./templateOverrides";
import { emailAdapter } from "./email";
import { inAppAdapter } from "./inapp";
import { kakaoBizTalkAdapter, xmsAdapter } from "./kakaoBizTalk";
import { renderTemplate, findTemplate, TemplateVariableError, fillUrlVariables } from "./templates";
import type { ChannelAdapter, SendRequest, SendResult } from "./types";

/**
 * 채널 우선순위.
 * 알림톡·이메일 중 설정된 것이 모두 주 채널로 나간다 — 알림톡 사전심사를 기다리는
 * 동안에도 이메일로는 같은 이벤트가 나가야 한다(types.ts 상단 주석). 둘 다 설정 전이면
 * 인앱만 나간다. 어느 경우든 인앱은 항상 함께 남긴다(기획서 1-62).
 */
function primaryAdapters(): ChannelAdapter[] {
  return [kakaoBizTalkAdapter, emailAdapter].filter((a) => a.isConfigured());
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
  /**
   * false 면 인앱 알림을 여기서 만들지 않는다 — 신청서 이벤트처럼 호출부가 이미 신청서에
   * 매인 인앱 알림(quoteId·링크 포함)을 만든 경우. 기본은 인앱도 남긴다(기획서 1-62).
   */
  inApp?: boolean;
  /** 인앱 알림을 눌렀을 때 갈 곳(건마다 달라지는 상세 화면 등). */
  inAppLink?: string | null;
  /**
   * 메일 본문에 넣을 버튼 링크를 건마다 바꾼다 (2026-09-02).
   *
   * 카카오 쪽 링크(kakaoUrl)는 템플릿 등록값 고정이라 건드리지 않는다 — 여기서 바꾸는
   * 것은 우리가 직접 만드는 메일 본문뿐이다. 비회원 문의처럼 로그인 화면이 아니라
   * 그 건 하나를 여는 링크를 줘야 할 때 쓴다.
   */
  buttonUrl?: string | null;
}

export interface DispatchOutcome {
  skipped?: "DUPLICATE" | "TEMPLATE_DISABLED";
  results: SendResult[];
}

/**
 * 한 이벤트를 발송한다.
 * 실패해도 예외를 던지지 않는다 — 알림 실패로 본 업무(가입 승인 등)가 되돌아가면 안 된다.
 */
/**
 * 응답을 막지 않고 발송한다.
 *
 * 가입·승인 라우트는 알림 결과를 쓰지 않는다. 그런데 await 하고 있어서, 외부 발송처가
 * 느리거나 닿지 않으면 그 시간만큼 사용자가 빈 화면을 본다 — DKT 검증 환경 방화벽이
 * 닫혀 있던 동안 회원가입이 10초 넘게 걸렸다. 알림이 늦는 것과 가입이 안 되는 것은
 * 다른 문제다.
 *
 * 발송 시도는 보내기 전에 이미 message_sends 에 QUEUED 로 남으므로, 응답을 먼저
 * 돌려줘도 "무엇을 보내려 했는지"는 사라지지 않는다.
 *
 * next start 는 오래 사는 프로세스라 응답 뒤에도 이 작업이 이어진다. 롤링 업데이트로
 * 파드가 내려가는 순간에 걸린 건은 QUEUED 로 남는다 — 그건 이력에서 보인다.
 */
export function dispatchMessageInBackground(input: DispatchInput): void {
  void dispatchMessage(input).catch((error) => {
    console.error(
      `[message] 백그라운드 발송 실패 template=${input.templateCode} key=${input.idempotencyKey}`,
      error,
    );
  });
}

export async function dispatchMessage(input: DispatchInput): Promise<DispatchOutcome> {
  // ② 중복 발송 차단. 배치 재실행·재시도에서 같은 메시지가 두 번 가는 것이 가장 흔한 사고다.
  if (await findSendByIdempotencyKey(input.idempotencyKey)) {
    return { skipped: "DUPLICATE", results: [] };
  }

  const def = findTemplate(input.templateCode);
  if (!def) return { skipped: "TEMPLATE_DISABLED", results: [] };

  const sendId = crypto.randomUUID();
  const variables = { ...(input.variables ?? {}), __sendId: sendId };

  // ④ 변수 바인딩 — 누락이면 발송하지 않고 오류로 남긴다. 카카오 버튼 URL 의 변수(0006·0016)도 같이 채운다.
  let body: string;
  // 환경별 신규 템플릿(예: MB-02-DEV)에 등록된 링크로 덮어쓸 수 있다(templateOverrides.ts).
  let kakaoUrl = def.button ? resolveKakaoButtonUrl(def.button.kakaoUrl) : null;
  let kakaoUrlPc: string | null = def.button?.kakaoUrlPc ?? null;
  let extra: { name: string; kakaoUrl: string; kakaoUrlPc?: string | null }[] | null = null;
  try {
    body = renderTemplate(input.templateCode, variables);
    if (kakaoUrl) kakaoUrl = fillUrlVariables(kakaoUrl, variables);
    if (kakaoUrlPc) kakaoUrlPc = fillUrlVariables(kakaoUrlPc, variables);
    if (def.kakaoExtraButtons?.length) {
      extra = def.kakaoExtraButtons.map((b) => ({
        name: b.name,
        kakaoUrl: fillUrlVariables(b.kakaoUrl, variables),
        kakaoUrlPc: b.kakaoUrlPc ? fillUrlVariables(b.kakaoUrlPc, variables) : null,
      }));
    }
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
          url:
            input.buttonUrl ??
            (input.request
              ? `${audienceOrigin(input.request, def.audience)}${def.button.path}`
              : def.button.path),
          kakaoUrl,
          // 템플릿에 PC 링크(linkPc)가 등록된 경우에만 채운다 — 있으면 url_pc 로 그대로 보낸다.
          kakaoUrlPc,
          extra,
        }
      : null,
    kakaoTemplateCode: resolveKakaoTemplateCode(def.code, def.kakaoTemplateCode),
    emphasis: def.emphasis ?? null,
    inAppLink: input.inAppLink ?? null,
  };

  const results: SendResult[] = [];

  // ⑥ 주 채널 발송 (설정된 것이 없으면 건너뛴다).
  //    카카오 정본에 없는 문안(운영자용 등)은 kakaoTemplateCode 가 없다 — 인앱만 남긴다.
  //    개발 환경 허용 목록 밖의 번호는 외부 발송을 건너뛰고 이력에 SKIPPED 로 남긴다(allowlist.ts).
  const externalAdapters = def.kakaoTemplateCode ? primaryAdapters() : [];
  if (externalAdapters.length > 0 && !isRecipientAllowed(input.recipient.phone)) {
    await recordSendAttempt({
      id: sendId,
      idempotencyKey: input.idempotencyKey,
      templateCode: input.templateCode,
      recipientId: input.recipient.userId,
      recipientPhone: input.recipient.phone,
      channel: "ALIMTALK",
      status: "SKIPPED",
      resultCode: "ALLOWLIST",
      resultMessage: "개발 허용 목록 밖의 번호 — 외부 발송 생략",
      payloadJson: JSON.stringify(variables),
      createdAt: new Date().toISOString(),
    });
    externalAdapters.length = 0;
  }
  for (const adapter of externalAdapters) {
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
    // 알림톡은 접수만 된 상태다 — 잠시 뒤 카카오 최종 결과를 받아 이력을 확정한다.
    if (result.ok && adapter.channel === "ALIMTALK") scheduleReconcile();
    // ⑦ 도달 불가(미가입·차단·수신거부)는 문자 대체발송 대상이다.
    //    대체발송을 DKT 에 맡기지 않고 우리가 하는 이유는, 맡기면 대체발송 사실이
    //    우리 이력에 남지 않아 "왜 문자로 갔는지"를 나중에 설명할 수 없기 때문이다.
    if (!result.ok && result.failure === "UNREACHABLE") {
      if (!xmsAdapter.isConfigured()) {
        // 발신번호 사전등록 전에는 문자를 보낼 수 없다(DKT 유저웹에서 등록한다).
        results.push({
          ok: false,
          channel: "LMS",
          failure: "UNREACHABLE",
          resultMessage: "문자 미설정 — 발신번호 사전등록 필요",
        });
      } else {
        const fallbackId = crypto.randomUUID();
        await recordSendAttempt({
          id: fallbackId,
          idempotencyKey: `${input.idempotencyKey}:LMS`,
          templateCode: input.templateCode,
          recipientId: input.recipient.userId,
          recipientPhone: input.recipient.phone,
          channel: "LMS",
          status: "QUEUED",
          payloadJson: JSON.stringify(variables),
          createdAt: new Date().toISOString(),
        });
        const fallback = await xmsAdapter.send({ ...request, variables: { ...variables, __sendId: fallbackId } });
        results.push(fallback);
        // 문자는 접수 응답만 동기로 온다 — 최종 결과는 폴링이 채운다(FALLBACK 로 남긴다).
        await updateSendResult(fallbackId, {
          status: fallback.ok ? "FALLBACK" : "FAILED",
          resultCode: fallback.resultCode ?? null,
          resultMessage: fallback.resultMessage ?? null,
          sentAt: fallback.ok ? new Date().toISOString() : null,
        });
      }
    }
  }

  // 인앱은 항상 남긴다. 위에서 이미 기록한 sendId 와 겹치지 않게 별도 행으로 남긴다.
  if (input.inApp === false) return { results };
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
