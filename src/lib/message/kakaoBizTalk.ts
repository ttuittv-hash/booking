// 카카오 알림톡 — DK테크인 Kakao i Connect Message 연동 (기획서 B2).
// 규격: https://docs.kakaoi.ai/kakao_i_connect_message/bizmessage/api/api_reference/at/
//
// 키를 아직 받지 못했다. isConfigured() 가 false 면 파이프라인이 이 채널을 건너뛰므로,
// 키가 들어오는 순간 환경변수만 채우면 그대로 살아난다.

import type { ChannelAdapter, FailureKind, SendRequest, SendResult } from "./types";

const TOKEN_PATH = "/v2/oauth/token";
const SEND_PATH = "/v2/send/kakao";

/** 토큰 유효기간이 길다(문서 예시 약 10일). 만료 1시간 전에 미리 갱신한다. */
let cached: { token: string; expiresAt: number } | null = null;

function baseUrl(): string {
  return (process.env.BIZTALK_BASE_URL || "").replace(/\/+$/, "");
}

export function isBizTalkConfigured(): boolean {
  return Boolean(
    process.env.BIZTALK_BASE_URL &&
      process.env.BIZTALK_CLIENT_ID &&
      process.env.BIZTALK_CLIENT_SECRET &&
      process.env.BIZTALK_SENDER_KEY &&
      process.env.BIZTALK_SENDER_NO,
  );
}

/**
 * OAuth 2.0 토큰 발급.
 * Authorization 형식이 일반적인 Basic 과 다르다 —
 * base64(id:secret) 이 아니라 "Basic {clientId} {clientSecret}" 로 공백 구분이다(문서 기준).
 */
export async function issueBizTalkToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60 * 60 * 1000) return cached.token;

  const res = await fetch(`${baseUrl()}${TOKEN_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${process.env.BIZTALK_CLIENT_ID} ${process.env.BIZTALK_CLIENT_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as {
    code?: string | number;
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error(`알림톡 토큰 발급 실패 (code=${json.code ?? res.status})`);
  }
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

/** 결과 코드를 우리 실패 분류로 옮긴다(문서 state_code 기준). */
export function classifyBizTalkCode(code: string | null | undefined): FailureKind {
  switch (String(code ?? "")) {
    case "200":
      return "UNKNOWN"; // 성공 — 호출부에서 ok 로 처리한다
    case "410":
    case "420":
      // 유효성·파일 오류는 템플릿·변수 문제다. 재시도해도 같은 결과라 중단한다.
      return "TEMPLATE";
    case "400":
      return "TEMPLATE";
    case "100":
    case "520":
    case "510":
    case "500":
      // 처리중·재처리·브로커·시스템 오류는 일시적일 수 있다.
      return "TRANSIENT";
    default:
      return "UNKNOWN";
  }
}

export const kakaoBizTalkAdapter: ChannelAdapter = {
  channel: "ALIMTALK",
  isConfigured: isBizTalkConfigured,

  async send(request: SendRequest): Promise<SendResult> {
    if (!request.recipient.phone) {
      return { ok: false, channel: "ALIMTALK", failure: "INVALID_NUMBER", resultMessage: "수신번호 없음" };
    }
    try {
      const token = await issueBizTalkToken();
      const body: Record<string, unknown> = {
        message_type: "AT",
        sender_key: process.env.BIZTALK_SENDER_KEY,
        // 우리 발송 이력 id 를 cid 로 넘겨 결과를 되짚을 수 있게 한다.
        cid: request.variables.__sendId ?? request.templateCode,
        template_code: request.templateCode,
        phone_number: request.recipient.phone.replace(/\D/g, ""),
        sender_no: process.env.BIZTALK_SENDER_NO,
        message: request.body,
        // 대체발송은 파이프라인이 직접 관리한다(어떤 실패에 무엇으로 보낼지 규칙이 우리 쪽에 있다).
        fall_back_yn: false,
      };
      if (request.button) {
        body.button = [
          {
            name: request.button.name,
            type: "WL",
            url_mobile: request.button.url,
            url_pc: request.button.url,
          },
        ];
      }

      const res = await fetch(`${baseUrl()}${SEND_PATH}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json()) as {
        code?: string;
        uid?: string;
        result?: { detail_code?: string; detail_message?: string };
      };

      if (String(json.code) === "200") {
        return {
          ok: true,
          channel: "ALIMTALK",
          providerMessageId: json.uid ?? null,
          resultCode: "200",
        };
      }
      return {
        ok: false,
        channel: "ALIMTALK",
        resultCode: json.result?.detail_code ?? String(json.code ?? res.status),
        resultMessage: json.result?.detail_message ?? null,
        failure: classifyBizTalkCode(json.code),
      };
    } catch (error) {
      // 타임아웃·네트워크 오류는 재시도 대상이다.
      return {
        ok: false,
        channel: "ALIMTALK",
        resultMessage: error instanceof Error ? error.message : "알 수 없는 오류",
        failure: "TRANSIENT",
      };
    }
  },
};
