"use client";

import { useState } from "react";

/**
 * 금액 입력 — `type="number"`는 브라우저 특성상 천단위 쉼표를 표시할 수 없어서
 * 텍스트 입력으로 만들고 쉼표 포맷을 직접 그려준다("어드민 숫자는 모두 천단위
 * 쉼표로" 요청, 2026-08-22).
 *
 * 편집 중(포커스)에는 타이핑한 그대로 두고, 포커스를 벗어날 때(blur)만 숫자만
 * 남겨 값을 확정하고 다시 쉼표를 붙인다 — 매 키 입력마다 다시 포맷하면 커서
 * 위치가 튀는 문제가 있어 그 방식은 쓰지 않는다. 포커스 밖에서는 항상 value prop을
 * 그대로 보여주므로(로컬 상태로 캐시하지 않음) 외부에서 값이 바뀌어도 어긋나지 않는다.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft ?? value.toLocaleString("ko-KR")}
      onFocus={() => setDraft(value.toLocaleString("ko-KR"))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const digits = (draft ?? "").replace(/[^\d-]/g, "");
        const parsed = digits === "" || digits === "-" ? 0 : Number(digits);
        onChange(parsed);
        setDraft(null);
      }}
      className={className}
      {...rest}
    />
  );
}
