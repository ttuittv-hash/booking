/**
 * 회원 승인 정책 — 운영자가 백오피스에서 켜고 끈다 (2026-09-04 팀 요청).
 *
 * 대표 담당자가 초대한 사람은 지금까지 가입하는 순간 바로 승인됐다. 대표가 이미 "이 번호의
 * 이 사람"을 지목했고 본인인증까지 통과했기 때문이다. 다만 개관 전 당분간은 서울아레나가
 * 한 번 더 확인하고 싶다는 요청이 있어, 초대 가입도 승인 대기로 두는 스위치를 만든다.
 *
 * 켜면(true) 초대로 들어온 사람도 '승인 대기'에 올라가 운영자가 승인해야 이용할 수 있다.
 * 끄면(false) 예전처럼 즉시 승인된다. 기본값은 지금 동작 그대로인 false 다.
 */
export interface MemberPolicy {
  /** 초대로 가입한 담당자도 서울아레나(운영자) 승인을 받게 할지 */
  inviteNeedsAdminApproval: boolean;
}

export const DEFAULT_MEMBER_POLICY: MemberPolicy = { inviteNeedsAdminApproval: false };

/** 저장 요청을 다듬는다 — 모르는 값이 오면 기본값을 지킨다. */
export function normalizeMemberPolicy(input: unknown): MemberPolicy {
  const v = (input as Partial<MemberPolicy> | null)?.inviteNeedsAdminApproval;
  return { inviteNeedsAdminApproval: v === true };
}

/**
 * 초대로 들어온 가입을 그 자리에서 승인해도 되는가.
 * 초대장이 확인된 가입이면서 정책이 꺼져 있을 때만 참이다.
 */
export function canAutoApproveInvite(inviteMatched: boolean, policy: MemberPolicy): boolean {
  return inviteMatched && !policy.inviteNeedsAdminApproval;
}
