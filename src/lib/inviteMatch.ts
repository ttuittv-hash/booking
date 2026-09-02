// 초대장 대조 규칙 — 번호·이메일이 초대장과 같은지 판정한다.
//
// invitation.ts 에서 갈라 나왔다(2026-09-02). 회원가입 화면이 제출 전에 같은 규칙으로
// 미리 알려 줘야 하는데, invitation.ts 는 node:crypto 를 써서 브라우저 번들에 넣을 수
// 없다. 판정 규칙이 서버·화면 두 곳으로 갈라지지 않도록 여기 한 곳에 두고 테스트로 고정한다.

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

/**
 * 초대장 이메일과 가입 이메일이 같은가 (2026-09-02).
 *
 * 예전에는 이메일이 달라도 가입이 되고 초대장만 남아, 담당자 관리 목록에 같은 사람이
 * "초대 발송(미가입)" 행과 가입자 행으로 두 줄 보였다. 이제 다르면 가입을 막는다.
 * 대소문자와 앞뒤 공백은 무시한다 — 메일 주소는 그 정도 차이로 다른 주소가 되지 않는다.
 */
export function inviteEmailMatches(
  signupEmail: string | null | undefined,
  invitationEmail: string | null | undefined,
): boolean {
  const a = (signupEmail ?? "").trim().toLowerCase();
  const b = (invitationEmail ?? "").trim().toLowerCase();
  if (!a || !b) return false;
  return a === b;
}

/**
 * 초대장에 적힌 이름과 본인인증한 이름이 같은가 (2026-09-02).
 *
 * 링크를 받은 1 이 2 에게 전달하면 2 가 가입할 수 있었다. 번호·이메일에 더해 이름까지
 * 맞아야 초대가 성립하게 한다 — 이름은 본인인증 결과라 신청자가 바꿀 수 없다.
 *
 * 공백만 무시한다. "홍 길동" 과 "홍길동" 은 같은 사람이지만, 직함이나 약칭("김대리")은
 * 다른 이름으로 본다 — 대표가 초대장에 실명을 적게 하는 편이 맞다.
 */
export function inviteNameMatches(
  verifiedName: string | null | undefined,
  invitationName: string | null | undefined,
): boolean {
  const a = (verifiedName ?? "").replace(/\s/g, "");
  const b = (invitationName ?? "").replace(/\s/g, "");
  if (!a || !b) return false;
  return a === b;
}

/**
 * 초대장에 적힌 번호를 가운데만 가려 보여 준다 ("01012345678" → "010-****-5678").
 * 링크를 쥔 사람에게 "어느 번호로 인증해야 하는지"를 알려 주되 번호 전체는 주지 않는다.
 */
export function maskInvitePhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 9) return "";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

/**
 * 마스킹된 번호로 하는 화면용 사전 대조 — 앞 3자리와 뒤 4자리만 본다.
 * 서버가 전체 번호로 다시 판정하므로(invitePhoneMatches) 이건 "제출하기 전에 알려 주기"
 * 용도다. 가운데 4자리가 다른 번호를 통과시킬 수 있지만, 그건 서버가 잡는다.
 */
export function invitePhoneLooksMatched(
  verifiedPhone: string | null | undefined,
  maskedPhone: string,
): boolean {
  const a = (verifiedPhone ?? "").replace(/\D/g, "");
  const b = maskedPhone.replace(/\D/g, ""); // 앞 3 + 뒤 4
  if (a.length < 9 || b.length !== 7) return false;
  return a.slice(0, 3) === b.slice(0, 3) && a.slice(-4) === b.slice(-4);
}
