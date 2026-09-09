"use client";

import { useId, useState } from "react";

/**
 * 비밀번호 입력칸 — 오른쪽 눈 버튼으로 입력한 값을 확인할 수 있다 (2026-09-07 팀 요청).
 *
 * 비밀번호는 8~20자에 대·소문자·숫자·특수문자를 모두 섞어야 해서 오타가 잦은데,
 * 가려진 채로는 어디서 틀렸는지 알 수 없다. 특히 재설정 화면은 두 칸이 서로
 * 일치해야 넘어가므로, 안 보이면 처음부터 다시 치는 수밖에 없었다.
 *
 * 쓰는 쪽은 `<input type="password" className="field-base" …>` 를 그대로 이 컴포넌트로
 * 바꾸면 된다 — 나머지 속성은 그대로 넘어간다.
 */
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** 감싸는 relative 상자에 덧붙일 클래스 (레이아웃 조정용) */
  wrapperClassName?: string;
  /**
   * 눈 버튼 자리를 옮길 때. 가입 화면처럼 오른쪽에 체크표시(✓)가 이미 있으면
   * `right-8` 로 왼쪽에 두고 입력칸 여백은 `padClassName` 으로 넓힌다.
   */
  buttonClassName?: string;
  /** 입력칸 오른쪽 여백 — 기본 pr-10 */
  padClassName?: string;
};

export function PasswordInput({
  className,
  wrapperClassName,
  buttonClassName,
  padClassName,
  ...rest
}: Props) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return (
    <span className={`relative block ${wrapperClassName ?? ""}`}>
      <input
        {...rest}
        type={shown ? "text" : "password"}
        aria-describedby={`${id}-toggle`}
        // 눈 버튼 자리(2.5rem)만큼 오른쪽을 비운다 — 긴 비밀번호가 버튼 밑으로 들어가지 않게.
        className={`${className ?? "field-base"} ${padClassName ?? "pr-10"}`}
      />
      <button
        type="button"
        id={`${id}-toggle`}
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "비밀번호 숨기기" : "비밀번호 표시"}
        aria-pressed={shown}
        // 폼 안에서 눌러도 제출되지 않게 type="button" 이고, 탭 순서에서는 빠진다
        // (키보드 사용자는 입력칸을 지나 바로 다음 칸으로 가는 편이 자연스럽다).
        tabIndex={-1}
        className={`absolute inset-y-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-foreground ${buttonClassName ?? "right-0"}`}
      >
        {shown ? (
          // 가리기 — 눈에 사선
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7 0 1-.7 2.3-1.8 3.5M6.3 6.8C4.2 8.2 3 10.2 3 12c0 2.5 4 7 9 7 1.4 0 2.7-.3 3.8-.9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          // 보기 — 뜬 눈
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 12c0-2.5 4-7 9-7s9 4.5 9 7-4 7-9 7-9-4.5-9-7z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        )}
      </button>
    </span>
  );
}
