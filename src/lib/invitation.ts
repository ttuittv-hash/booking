// 담당자 초대 토큰 (기획서 A11).
//
// 원문 토큰은 링크로만 나가고 DB 에는 해시만 남긴다 — DB 가 유출돼도
// 그것만으로는 유효한 초대 링크를 만들 수 없게 한다.

import crypto from "node:crypto";

/** 초대 링크 유효기간 — 기획서 A11 기준 7일. */
export const INVITE_TTL_DAYS = 7;

export function issueInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt(from = Date.now()): string {
  return new Date(from + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * 본인인증한 휴대폰 번호가 초대장에 적힌 번호와 같은가 (2026-08-28).
 *
 * 초대로 들어온 사람은 심사 없이 바로 승인되므로, 그 특권을 줄지 정하는 유일한 관문이다.
 * 그래서 규칙을 라우트 안에 흩지 않고 여기 한 곳에 두고 테스트로 고정한다.
 *
 * 판정:
 *   - 숫자만 남겨 비교한다. 초대는 "010-1234-5678", 인증 결과는 "01012345678" 로 온다.
 *   - 둘 중 하나라도 없으면 불일치. 특히 **인증 번호가 없으면** 절대 통과시키지 않는다 —
 *     본인인증을 쓰지 않는 환경에서 번호만 맞춰 적어도 통과하는 문이 되면 안 된다.
 *   - 자릿수가 비정상(9자리 미만)이면 불일치. 빈 문자열끼리 같다고 판정되는 걸 막는다.
 */
export function invitePhoneMatches(
  verifiedPhone: string | null | undefined,
  invitationPhone: string | null | undefined,
): boolean {
  const a = (verifiedPhone ?? "").replace(/\D/g, "");
  const b = (invitationPhone ?? "").replace(/\D/g, "");
  if (a.length < 9 || b.length < 9) return false;
  return a === b;
}
