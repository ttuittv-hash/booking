// 담당자 초대 토큰 (기획서 A11).
//
// 원문 토큰은 링크로만 나가고 DB 에는 해시만 남긴다 — DB 가 유출돼도
// 그것만으로는 유효한 초대 링크를 만들 수 없게 한다.

import crypto from "node:crypto";

/**
 * 초대 링크 유효기간. 기획서 A11 은 7일 기준이었으나, 알림톡 문구(MB-06)가
 * 먼저 "3일 이내에"로 나가고 있었다 — 실제 만료(7일)와 안내(3일)가 어긋나
 * 있던 것을 안내에 맞춰 3일로 통일한다(2026-09-03).
 */
export const INVITE_TTL_DAYS = 3;

export function issueInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt(from = Date.now()): string {
  return new Date(from + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// 초대장 대조 규칙(번호·이메일)은 클라이언트에서도 써야 해 별도 모듈에 있다 —
// 이 파일은 node:crypto 를 쓰므로 브라우저 번들에 들어갈 수 없다.
export {
  inviteEmailMatches,
  inviteNameMatches,
  invitePhoneLooksMatched,
  invitePhoneMatches,
  maskInvitePhone,
} from "./inviteMatch";
