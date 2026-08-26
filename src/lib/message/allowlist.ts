// 외부 채널(알림톡·문자) 수신자 허용 목록 — 개발 환경 안전장치.
//
// dev 에 발신번호까지 넣어 채널을 켜면, E2E 가 만드는 가짜 번호(0100000xxxx)나
// 팀원이 아무렇게나 넣은 번호로도 실제 카카오 발송이 나간다(과금·오발송).
// `BIZTALK_RECIPIENT_ALLOWLIST` 에 쉼표로 번호를 적어 두면 그 번호에만 외부 발송하고,
// 나머지는 이력에 SKIPPED 로 남기고 인앱만 보낸다. 운영에는 이 변수를 두지 않는다(전원 발송).

export function isRecipientAllowed(phone: string | null | undefined, raw = process.env.BIZTALK_RECIPIENT_ALLOWLIST): boolean {
  const list = (raw ?? "")
    .split(",")
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean);
  if (list.length === 0) return true;
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length > 0 && list.includes(digits);
}
