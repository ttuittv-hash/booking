// NICE평가정보 「통합인증 — 휴대폰 본인확인」 연동 (기획서 A4).
//
// 사업자 진위확인(src/lib/nice.ts)과는 다른 상품이다. 계약·자격증명·엔드포인트가 모두 별개라
// 같은 모듈에 섞지 않는다.
//
//   1. auth/token   접근토큰 발급 (24시간 유효)
//   2. auth/url     표준창 일회성 URL 발급 → 사용자에게 팝업으로 띄운다
//   3. return_url   인증 완료 후 web_transaction_id 를 받는다
//   4. auth/result  암호화된 인증 결과(enc_data) 수신
//   5. 무결성 검증 → 복호화
//
// 5번을 건너뛰면 위변조된 인증 결과를 그대로 신뢰하게 된다. 복호화 전에 반드시 검증한다.

import crypto from "node:crypto";

const BASE_URL = process.env.NICE_AUTH_BASE_URL || "https://auth.niceid.co.kr";
const TOKEN_PATH = "/ido/intc/v1.0/auth/token";
const URL_PATH = "/ido/intc/v1.0/auth/url";
const RESULT_PATH = "/ido/intc/v1.0/auth/result";

/** 표준창에 띄울 인증 수단. 기획서 A4 — 휴대폰 단일, 아이핀 제외 확정. */
const SVC_TYPES = ["M"] as const;

export function isNiceAuthConfigured(): boolean {
  return Boolean(process.env.NICE_AUTH_CLIENT_ID && process.env.NICE_AUTH_CLIENT_SECRET);
}

/** 요청고유번호 — 문서 규격상 20~50byte. */
export function buildRequestNo(prefix: string): string {
  const rand = crypto.randomBytes(8).toString("hex");
  return `ARENA-${prefix}-${Date.now()}-${rand}`.slice(0, 50);
}

function commonHeaders(): Record<string, string> {
  return {
    "Content-type": "application/json",
    "X-Intc-DevLang": "Linux/NodeJS",
  };
}

export interface NiceAuthToken {
  accessToken: string;
  ticket: string;
  iterations: number;
}

/** 접근토큰 발급. Authorization 은 Base64Url(client_id:client_secret) 이고 패딩을 뺀다. */
export async function issueAccessToken(): Promise<NiceAuthToken> {
  const id = process.env.NICE_AUTH_CLIENT_ID ?? "";
  const secret = process.env.NICE_AUTH_CLIENT_SECRET ?? "";
  const basic = Buffer.from(`${id}:${secret}`).toString("base64url");

  const res = await fetch(`${BASE_URL}${TOKEN_PATH}`, {
    method: "POST",
    headers: { ...commonHeaders(), Authorization: `Basic ${basic}` },
    body: JSON.stringify({ grant_type: "client_credentials", request_no: buildRequestNo("TK") }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as {
    result_code?: string;
    result_message?: string;
    access_token?: string;
    ticket?: string;
    iterators?: number;
  };
  if (json.result_code !== "0000" || !json.access_token || !json.ticket) {
    throw new Error(`본인인증 토큰 발급 실패 (${json.result_code ?? "?"} ${json.result_message ?? ""})`);
  }
  return {
    accessToken: json.access_token,
    ticket: json.ticket,
    // 키 유도 반복 횟수. 응답에 없으면 복호화가 불가능하므로 임의 기본값을 두지 않는다.
    iterations: json.iterators as number,
  };
}

export interface NiceAuthUrl {
  authUrl: string;
  transactionId: string;
  requestNo: string;
}

/** 표준창 URL 발급. 이 URL 을 그대로 팝업으로 열면 된다. */
export async function issueAuthUrl(
  token: NiceAuthToken,
  returnUrl: string,
  closeUrl?: string,
): Promise<NiceAuthUrl> {
  const requestNo = buildRequestNo("URL");
  const res = await fetch(`${BASE_URL}${URL_PATH}`, {
    method: "POST",
    headers: { ...commonHeaders(), Authorization: `Bearer ${token.accessToken}` },
    body: JSON.stringify({
      request_no: requestNo,
      return_url: returnUrl,
      ...(closeUrl ? { close_url: closeUrl } : {}),
      svc_types: SVC_TYPES,
      method_type: "GET",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as {
    result_code?: string;
    result_message?: string;
    auth_url?: string;
    transaction_id?: string;
  };
  if (json.result_code !== "0000" || !json.auth_url || !json.transaction_id) {
    throw new Error(`인증 URL 발급 실패 (${json.result_code ?? "?"} ${json.result_message ?? ""})`);
  }
  return { authUrl: json.auth_url, transactionId: json.transaction_id, requestNo };
}

// ── 키 유도 · 무결성 · 복호화 ────────────────────────────────────────────────
//
// 문서 3.1 기준. 유도된 문자열을 Base64 디코딩하지 않고 "문자열 그대로" 잘라 쓴다는 점이
// 함정이다 — 디코딩하면 키가 달라져 복호화가 조용히 실패한다.

/** PBKDF2(HMAC-SHA256, 64byte) → Base64Url(패딩 없음) 문자열. */
export function deriveKeyString(ticket: string, transactionId: string, iterations: number): string {
  return crypto.pbkdf2Sync(ticket, transactionId, iterations, 64, "sha256").toString("base64url");
}

/** 유도 문자열 앞 32byte 가 대칭키, 48번째부터 32byte 가 무결성키다. */
export function splitKeys(keyString: string): { key: string; hmacKey: string } {
  return { key: keyString.substring(0, 32), hmacKey: keyString.substring(48, 48 + 32) };
}

/** enc_data 의 HMAC-SHA256 을 Base64Url(패딩 없음)로 만든다 — integrity_value 와 대조할 값. */
export function integrityValue(encData: string, hmacKey: string): string {
  return crypto.createHmac("sha256", hmacKey).update(encData).digest("base64url");
}

/**
 * AES-256-GCM 복호화.
 * enc_data 를 Base64Url 디코딩하면 [IV 16byte | 암호문 | 인증태그 16byte] 순서다.
 */
export function decryptResult(encData: string, key: string): string {
  const raw = Buffer.from(encData, "base64url");
  const iv = raw.subarray(0, 16);
  const tag = raw.subarray(raw.length - 16);
  const cipherText = raw.subarray(16, raw.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key, "utf8"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString("utf8");
}

export interface NiceIdentity {
  name: string;
  birthdate: string;
  /** '0' 여자 / '1' 남자 */
  gender: string | null;
  /** '0' 내국인 / '1' 외국인 */
  nationalInfo: string | null;
  ci: string;
  di: string;
  /** '1' SKT '2' KT '3' LGU+ '5','6','7' 알뜰폰 */
  mobileCo: string | null;
  mobileNo: string | null;
}

export interface NiceAuthResult {
  identity: NiceIdentity;
  responseNo: string | null;
}

/**
 * 인증 결과 조회 + 무결성 검증 + 복호화.
 * 무결성 검증에 실패하면 결과를 버린다 — 이 단계를 통과하지 못한 값은 신뢰할 수 없다.
 */
export async function fetchAuthResult(
  token: NiceAuthToken,
  params: { webTransactionId: string; transactionId: string; requestNo: string },
): Promise<NiceAuthResult> {
  const res = await fetch(`${BASE_URL}${RESULT_PATH}`, {
    method: "POST",
    headers: { ...commonHeaders(), Authorization: `Bearer ${token.accessToken}` },
    body: JSON.stringify({
      web_transaction_id: params.webTransactionId,
      transaction_id: params.transactionId,
      request_no: params.requestNo,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as {
    result_code?: string;
    result_message?: string;
    enc_data?: string;
    integrity_value?: string;
  };
  if (json.result_code !== "0000" || !json.enc_data) {
    throw new Error(`인증 결과 조회 실패 (${json.result_code ?? "?"} ${json.result_message ?? ""})`);
  }

  const { key, hmacKey } = splitKeys(
    deriveKeyString(token.ticket, params.transactionId, token.iterations),
  );

  const expected = integrityValue(json.enc_data, hmacKey);
  if (!json.integrity_value || !timingSafeEqualStr(expected, json.integrity_value)) {
    throw new Error("인증 결과 무결성 검증에 실패했습니다.");
  }

  const decoded = JSON.parse(decryptResult(json.enc_data, key)) as Record<string, string>;
  if (!decoded.ci || !decoded.di) {
    throw new Error("인증 결과에 CI/DI 가 없습니다.");
  }
  return {
    responseNo: decoded.response_no ?? null,
    identity: {
      name: decoded.name ?? "",
      birthdate: decoded.birthdate ?? "",
      gender: decoded.gender ?? null,
      nationalInfo: decoded.national_info ?? null,
      ci: decoded.ci,
      di: decoded.di,
      mobileCo: decoded.mobile_co ?? null,
      mobileNo: decoded.mobile_no ?? null,
    },
  };
}

/** 길이가 다르면 timingSafeEqual 이 예외를 던지므로 감싼다. */
function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** 통신사 코드 라벨. 알뜰폰(5·6·7)은 별도 표기해 인증 불가 문의를 구분하는 데 쓴다. */
export const MOBILE_CO_LABEL: Record<string, string> = {
  "1": "SKT",
  "2": "KT",
  "3": "LG U+",
  "5": "SKT 알뜰폰",
  "6": "KT 알뜰폰",
  "7": "LG U+ 알뜰폰",
};
