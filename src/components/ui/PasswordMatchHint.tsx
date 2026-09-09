// 비밀번호 확인 칸 아래의 일치 여부 표시.
//
// 제출을 눌러야 "비밀번호가 다릅니다"를 알게 되면, 어느 쪽을 잘못 쳤는지 몰라 둘 다
// 다시 치게 된다. 확인 칸에 뭔가 입력된 순간부터 실시간으로 알려 준다.
// 확인 칸이 비어 있는 동안은 아무 말도 하지 않는다 — 치기도 전에 "다릅니다"는 잔소리다.
//
// 표기는 사용자가 공유한 레퍼런스(원형 느낌표 아이콘 + 한 문장)를 따른다.

function IconCircle({ tone, children }: { tone: "ok" | "danger"; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none text-background ${
        tone === "ok" ? "bg-ok" : "bg-danger"
      }`}
    >
      {children}
    </span>
  );
}

export function PasswordMatchHint({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm) return null;
  const match = password === confirm;
  return (
    <p
      data-testid="pw-match"
      data-state={match ? "match" : "mismatch"}
      className={`mt-2 flex items-center gap-1.5 text-xs ${match ? "text-ok" : "text-danger"}`}
      aria-live="polite"
    >
      <IconCircle tone={match ? "ok" : "danger"}>{match ? "✓" : "!"}</IconCircle>
      {match ? "비밀번호가 일치합니다." : "비밀번호와 비밀번호 확인이 일치하지 않습니다."}
    </p>
  );
}

/**
 * 입력칸 오른쪽 끝의 ✓ — 값이 조건을 통과했을 때만 보인다(레퍼런스의 체크 표시).
 * input 을 relative 래퍼로 감싸고 이 컴포넌트를 나란히 둔다.
 */
export function InputCheckMark({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-s font-bold text-ok"
    >
      ✓
    </span>
  );
}
