// 카카오 알림톡 · 문자(XMS) — DK테크인 BizMsg 연동 (기획서 B2).
//
// 2026-08-20 DKT 메시지서비스팀이 검증(CBT) 계정과 발송 가이드를 보내왔다. 그 가이드의
// 흐름을 그대로 옮긴 것이 이 파일이다.
//
//   ① 토큰 발급   POST /v2/oauth/token          — 6시간 유효, 4~5시간마다 갱신
//   ② 알림톡      POST /v2/request/{cid}/kakao
//   ③ 문자(XMS)   POST /v2/request/{cid}/xms
//   ④ 결과 폴링   GET  /v2/info/message/results
//   ⑤ 폴링 완료   GET  /v2/info/message/results/complete/{reportGroupNumber}
//
// 문자는 SM 24시간·LM 72시간까지 결과를 기다리므로 발송 응답만으로는 성패를 알 수 없다.
// 알림톡 대체발송 건도 마찬가지다 — 그래서 ④⑤ 폴링이 필요하다.
//
// 검증 환경은 방화벽 개방 전까지 닿지 않는다(2026-08-24 오후 예정). isConfigured() 가
// false 면 파이프라인이 이 채널을 건너뛰므로, 환경변수만 채우면 그대로 살아난다.

import type { ChannelAdapter, FailureKind, SendRequest, SendResult } from "./types";

const TOKEN_PATH = "/v2/oauth/token";
const RESULTS_PATH = "/v2/info/message/results";

/** 토큰은 6시간 유효하다. 가이드대로 4~5시간 쓰고 갱신한다(만료 1시간 전). */
const TOKEN_RENEW_MARGIN_MS = 60 * 60 * 1000;

let cached: { token: string; expiresAt: number } | null = null;

/*
  회로 차단기.

  가입 승인·회원가입 라우트가 dispatchMessage 를 await 한다. 그래서 DKT 가 닿지 않으면
  알림 한 건마다 타임아웃(10~15초)만큼 화면이 멈춘다 — 회원가입은 알림을 세 번 보내므로
  30초 넘게 붙잡힌다. 알림이 늦는 것과 가입이 안 되는 것은 전혀 다른 문제다.

  그래서 "연결 자체가 안 되는" 실패가 이어지면 잠시 이 채널을 건너뛴다. API 가 응답은
  했는데 거절한 경우(템플릿 오류 등)는 세지 않는다 — 그건 서버가 살아 있다는 뜻이다.

  검증 환경 방화벽이 열리기 전(2026-08-24 예정)에도 이 덕분에 화면이 느려지지 않는다.
*/
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 5 * 60 * 1000;
let transportFailures = 0;
let breakerOpenUntil = 0;

function breakerOpen(): boolean {
  return Date.now() < breakerOpenUntil;
}

function noteTransportFailure(): void {
  transportFailures += 1;
  if (transportFailures >= BREAKER_THRESHOLD) {
    breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
    transportFailures = 0;
  }
}

function noteReachable(): void {
  transportFailures = 0;
  breakerOpenUntil = 0;
}

/** 테스트용 — 차단기 상태를 초기화한다. */
export function resetBizTalkBreaker(): void {
  transportFailures = 0;
  breakerOpenUntil = 0;
}

const BREAKER_RESULT = {
  resultCode: "BREAKER_OPEN",
  resultMessage: "DK테크인 연결 실패가 이어져 잠시 건너뜁니다",
} as const;

/** 테스트·재로그인용 — 캐시된 토큰을 버린다. */
export function resetBizTalkToken(): void {
  cached = null;
}

function baseUrl(): string {
  return (process.env.BIZTALK_BASE_URL || "").replace(/\/+$/, "");
}

/**
 * 알림톡도 발신번호(sender_no)가 필수다 — 2026-08-25 검증 서버 실측:
 * sender_no 없이 보내면 API_4611 "sender_no는 필수값입니다". 문자 대체발송용인 줄
 * 알았는데 카카오 발송에도 요구한다. 발신번호 사전등록(유저웹) 전에는 채널을 켜지 않는다.
 */
export function isBizTalkConfigured(): boolean {
  return Boolean(
    process.env.BIZTALK_BASE_URL &&
      process.env.BIZTALK_CLIENT_ID &&
      process.env.BIZTALK_CLIENT_SECRET &&
      process.env.BIZTALK_SENDER_KEY &&
      process.env.BIZTALK_SENDER_NO,
  );
}

/** 문자 발송 조건은 알림톡과 같다(발신번호 포함). */
export function isXmsConfigured(): boolean {
  return isBizTalkConfigured();
}

/**
 * 발송 URL 의 {cid}.
 *
 * 확인 필요 — DKT 가이드는 `/v2/request/{{cid}}/kakao` 로만 적어 두고 cid 가 무엇인지
 * 설명하지 않았다. 같은 제품군(Kakao i Connect Message) 문서에서는 "고객사가 매기는
 * 메시지 고유 ID"라서 발송 이력 id 를 쓴다. 계약 ID(clientId)일 가능성도 있어
 * BIZTALK_CID 로 덮어쓸 수 있게 뒀다 — 방화벽이 열리면 스웨거로 확정할 것.
 * (scripts/biztalk-check.mjs 가 두 형태를 모두 찔러 본다.)
 */
/** 발송 요청이 접수된 코드 — 100(처리중) / 200(성공). */
export function isAcceptedCode(code: string | number | null | undefined): boolean {
  const c = String(code ?? "");
  return c === "100" || c === "200";
}

function requestCid(request: SendRequest): string {
  return process.env.BIZTALK_CID || request.variables.__sendId || request.templateCode;
}

/**
 * OAuth 2.0 토큰 발급.
 * Authorization 형식이 일반적인 Basic 과 다르다 —
 * base64(id:secret) 이 아니라 "Basic {clientId} {clientSecret}" 로 공백 구분이다(문서 기준).
 */
export async function issueBizTalkToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + TOKEN_RENEW_MARGIN_MS) return cached.token;

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
    // 서버가 응답은 했다 — 연결 문제는 아니므로 차단기를 건드리지 않는다.
    noteReachable();
    throw new Error(`알림톡 토큰 발급 실패 (code=${json.code ?? res.status})`);
  }
  noteReachable();
  cached = {
    // expires_in 이 없으면 가이드의 6시간을 쓴다.
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 6 * 3600) * 1000,
  };
  return cached.token;
}

/** 결과 코드를 우리 실패 분류로 옮긴다(가이드 state_code 기준). */
export function classifyBizTalkCode(
  code: string | number | null | undefined,
  detailCode?: string | null,
): FailureKind {
  // 상세코드(가이드 v2.2.1 Appendix A)가 있으면 그쪽이 더 정확하다.
  switch (detailCode ?? "") {
    case "ERR11000": // 수신 거부 대상 → 문자 대체
      return "UNREACHABLE";
    case "ERR50025": // 수신자 번호 유효하지 않음
    case "ERR50028":
    case "ERR50029":
      return "INVALID_NUMBER";
    case "ERR41001": // 미등록 템플릿
    case "ERR42009": // 세칙검사 불통과(템플릿 본문 불일치)
      return "TEMPLATE";
  }
  switch (String(code ?? "")) {
    case "200":
      return "UNKNOWN"; // 성공 — 호출부에서 ok 로 처리한다
    case "410":
    case "420":
    case "400":
    case "API_4611": // 파라미터 오류 — 재시도해도 같다
      // 유효성·파일 오류는 템플릿·변수 문제다. 재시도해도 같은 결과라 중단한다.
      return "TEMPLATE";
    case "100":
    case "500":
    case "510":
    case "520":
      // 처리중·재처리·브로커·시스템 오류는 일시적일 수 있다.
      return "TRANSIENT";
    case "API_402":
      // 발송 권한 없음 — DKT 쪽 계정 활성화 문제. 재시도할 일이 아니다.
      return "UNKNOWN";
    default:
      return "UNKNOWN";
  }
}

async function postJson(path: string, token: string, body: unknown) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    code?: string | number;
    uid?: string;
    result?: { detail_code?: string; detail_message?: string };
  };
  return { status: res.status, json };
}

export const kakaoBizTalkAdapter: ChannelAdapter = {
  channel: "ALIMTALK",
  isConfigured: isBizTalkConfigured,

  async send(request: SendRequest): Promise<SendResult> {
    if (!request.recipient.phone) {
      return { ok: false, channel: "ALIMTALK", failure: "INVALID_NUMBER", resultMessage: "수신번호 없음" };
    }
    if (breakerOpen()) {
      return { ok: false, channel: "ALIMTALK", failure: "TRANSIENT", ...BREAKER_RESULT };
    }
    try {
      const token = await issueBizTalkToken();
      const body: Record<string, unknown> = {
        message_type: "AT",
        sender_key: process.env.BIZTALK_SENDER_KEY,
        // DKT 에 등록된 코드로 보낸다 — 내부 코드(MB-xx)는 이력용이다.
        template_code: request.kakaoTemplateCode ?? request.templateCode,
        phone_number: request.recipient.phone.replace(/\D/g, ""),
        message: request.body,
        // 강조표기형 템플릿의 강조 문구(title, ≤50자). 부제목은 DKT 발송 스펙(v2.2.1)에 없고
        // 템플릿 등록값이 그대로 쓰이므로 보내지 않는다.
        ...(request.emphasis ? { title: request.emphasis.title } : {}),
        // 대체발송은 파이프라인이 직접 관리한다 — 어떤 실패에 무엇으로 보낼지 규칙이 우리 쪽에 있다.
        // DKT 에 맡기면 우리 이력에 대체발송 사실이 남지 않는다.
        fall_back_yn: false,
      };
      body.sender_no = process.env.BIZTALK_SENDER_NO;
      // 버튼은 카카오 템플릿 등록값과 글자 단위로 같아야 한다(이름·WL·url_mobile). 실측 2026-08-26:
      // dev 주소를 보내도, 버튼을 아예 빼도 3027 NoMatchedTemplateButtonException. 등록된 링크는
      // url_mobile 만 있으므로 url_pc 는 싣지 않는다. 인앱·이메일은 환경별 주소(request.button.url)를 쓴다.
      if (request.button?.kakaoUrl) {
        body.button = [{ name: request.button.name, type: "WL", url_mobile: request.button.kakaoUrl }];
      }

      const { status, json } = await postJson(
        `/v2/request/${encodeURIComponent(requestCid(request))}/kakao`,
        token,
        body,
      );

      // 실측(2026-08-26): 접수 응답은 code "100"(처리중, 카카오발송접수성공)이다 — 최종 성패는
      // 폴링(reconcile.ts)이 채운다. "200" 도 성공으로 본다(가이드 Appendix A).
      if (isAcceptedCode(json.code)) {
        return {
          ok: true,
          channel: "ALIMTALK",
          providerMessageId: json.uid ?? null,
          resultCode: String(json.code),
          resultMessage: json.result?.detail_message ?? null,
        };
      }
      return {
        ok: false,
        channel: "ALIMTALK",
        resultCode: json.result?.detail_code ?? String(json.code ?? status),
        resultMessage: json.result?.detail_message ?? null,
        failure: classifyBizTalkCode(json.code, json.result?.detail_code),
      };
    } catch (error) {
      // 타임아웃·네트워크 오류는 재시도 대상이다. 이어지면 잠시 채널을 닫는다.
      noteTransportFailure();
      return {
        ok: false,
        channel: "ALIMTALK",
        resultMessage: error instanceof Error ? error.message : "알 수 없는 오류",
        failure: "TRANSIENT",
      };
    }
  },
};

/**
 * 문자(XMS) — 알림톡이 도달하지 못했을 때의 대체발송 채널.
 *
 * 발송 응답은 "접수했다"까지만 말해 준다. 실제 성패는 폴링으로 확인한다
 * (SM 24시간·LM 72시간까지 대기하므로 동기 응답이 불가능하다).
 */
export const xmsAdapter: ChannelAdapter = {
  channel: "LMS",
  isConfigured: isXmsConfigured,

  async send(request: SendRequest): Promise<SendResult> {
    if (!request.recipient.phone) {
      return { ok: false, channel: "LMS", failure: "INVALID_NUMBER", resultMessage: "수신번호 없음" };
    }
    if (breakerOpen()) {
      return { ok: false, channel: "LMS", failure: "TRANSIENT", ...BREAKER_RESULT };
    }
    try {
      const token = await issueBizTalkToken();
      const { status, json } = await postJson(
        `/v2/request/${encodeURIComponent(requestCid(request))}/xms`,
        token,
        {
          // 90바이트를 넘으면 LMS 로 나간다. 우리 템플릿은 대부분 넘으므로 제목을 함께 보낸다.
          message_type: "LM",
          sender_no: process.env.BIZTALK_SENDER_NO,
          phone_number: request.recipient.phone.replace(/\D/g, ""),
          title: process.env.BIZTALK_LMS_TITLE || "서울아레나",
          message: request.body,
        },
      );
      if (isAcceptedCode(json.code)) {
        // 접수만 된 상태다. 최종 결과는 폴링으로 갱신한다.
        return {
          ok: true,
          channel: "LMS",
          providerMessageId: json.uid ?? null,
          resultCode: String(json.code),
          resultMessage: json.result?.detail_message ?? null,
        };
      }
      return {
        ok: false,
        channel: "LMS",
        resultCode: json.result?.detail_code ?? String(json.code ?? status),
        resultMessage: json.result?.detail_message ?? null,
        failure: classifyBizTalkCode(json.code, json.result?.detail_code),
      };
    } catch (error) {
      noteTransportFailure();
      return {
        ok: false,
        channel: "LMS",
        resultMessage: error instanceof Error ? error.message : "알 수 없는 오류",
        failure: "TRANSIENT",
      };
    }
  },
};

export interface PolledResult {
  /** 우리가 넘긴 cid — 발송 이력 id */
  cid: string | null;
  uid: string | null;
  stateCode: string | null;
  message: string | null;
}

interface PolledRow {
  cid?: string;
  uid?: string;
  status_code?: string;
  state_code?: string;
  kko_status_code?: string;
  error_message?: string;
  message?: string;
}

export interface PollBatch {
  reportGroupNumber: string | null;
  results: PolledResult[];
}

/**
 * ④ 결과 폴링 — 문자와 알림톡 대체발송 건의 최종 결과를 받아 온다.
 * 받은 뒤에는 반드시 completePoll() 로 확인 처리를 해야 같은 건이 다시 내려오지 않는다.
 */
export async function pollMessageResults(): Promise<PollBatch> {
  const token = await issueBizTalkToken();
  const res = await fetch(`${baseUrl()}${RESULTS_PATH}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  // 실측(2026-08-25): 그룹번호 키는 report_group_no 다(가이드 표기와 다름). 옛 표기도 받아 둔다.
  const json = (await res.json().catch(() => ({}))) as {
    report_group_no?: string;
    report_group_number?: string;
    results?: PolledRow[];
    data?: PolledRow[];
  };
  return {
    reportGroupNumber: json.report_group_no ?? json.report_group_number ?? null,
    // 가이드 v2.2.1 필드는 status_code / error_message (state_code·message 는 구 표기).
    results: (json.results ?? json.data ?? []).map((r) => ({
      cid: r.cid ?? null,
      uid: r.uid ?? null,
      stateCode: r.status_code ?? r.state_code ?? null,
      message: r.error_message ?? r.message ?? r.kko_status_code ?? null,
    })),
  };
}

/**
 * ⑤ 폴링 완료 처리 — 이걸 빼먹으면 같은 결과가 계속 다시 내려온다.
 * 실측(2026-08-25): 메서드는 PUT 이고, HTTP 는 항상 200 이며 본문 code 로 성패를 말한다
 * (GET/POST 는 "method is not supported"). 가이드의 cbt-ceb 호스트는 DNS 가 없는 오타 —
 * 다른 API 와 같은 호스트를 쓴다.
 */
export async function completePoll(reportGroupNumber: string): Promise<boolean> {
  const token = await issueBizTalkToken();
  const res = await fetch(
    `${baseUrl()}${RESULTS_PATH}/complete/${encodeURIComponent(reportGroupNumber)}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  const json = (await res.json().catch(() => ({}))) as { code?: string | number };
  return res.ok && String(json.code) === "200";
}
