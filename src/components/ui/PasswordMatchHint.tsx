// 비밀번호 확인 칸 아래의 일치 여부 표시.
//
// 제출을 눌러야 "비밀번호가 다릅니다"를 알게 되면, 어느 쪽을 잘못 쳤는지 몰라 둘 다
// 다시 치게 된다. 확인 칸에 뭔가 입력된 순간부터 실시간으로 알려 준다.
// 확인 칸이 비어 있는 동안은 아무 말도 하지 않는다 — 치기도 전에 "다릅니다"는 잔소리다.

export function PasswordMatchHint({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm) return null;
  const match = password === confirm;
  return (
    <p
      data-testid="pw-match"
      data-state={match ? "match" : "mismatch"}
      className={`mt-1.5 text-xs ${match ? "text-ok" : "text-danger"}`}
      aria-live="polite"
    >
      {match ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
    </p>
  );
}
