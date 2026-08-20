"use client";

const STEP_NAMES = [
  "공간 선택",
  "주차 선택",
  "규모/패키지",
  "기본 포함사항",
  "추가 옵션",
  "예상 대관료",
  "공연 정보",
  "신청서",
];

/**
 * 스텝 인디케이터 — Figma MARKETING COMPONENTS › **Multi-step Forms › Multi Form / 5**.
 *
 *   원형 번호 칩(24px) + 스텝 제목(14px)이 한 줄로, 가운데 정렬.
 *   완료 = 체크 원 / 현재 = 검정 채움 원 / 미완료 = 헤어라인 원 + muted
 *
 * 위저드 전체가 "선택·현재 = 검정 채움" 한 가지 언어만 쓴다. 옐로는 쓰지 않는다.
 *
 * 레이아웃 주의: 스텝 전환 시 위저드 폭이 흔들리던 버그(5cfc178 / 310e689)를
 * 다시 만들지 않기 위해, 음수 마진으로 그리드 트랙 밖으로 빼지 않고 컬럼 안에서
 * w-full + overflow-x-auto 로만 처리한다. (콘텐츠가 트랙 폭을 늘리면 안 된다)
 */
function CheckMark() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StepNav({
  step,
  maxUnlockedStep,
  onJump,
}: {
  step: number;
  maxUnlockedStep: number;
  onJump: (step: number) => void;
}) {
  return (
    <nav
      aria-label="신청 단계"
      // sticky 오프셋은 상단바 높이 토큰(`--header-h`)을 그대로 따른다.
      className="sticky top-[var(--header-h)] z-20 mb-10 w-full border-b border-border/25 bg-background"
    >
      <ol className="flex w-full min-w-0 items-center justify-start gap-x-5 gap-y-2 overflow-x-auto py-4 lg:flex-wrap lg:justify-center lg:overflow-visible">
        {STEP_NAMES.map((name, i) => {
          const s = i + 1;
          const isActive = s === step;
          const isDone = s < step;
          const disabled = s > maxUnlockedStep;
          return (
            <li key={name} className="shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onJump(s)}
                aria-current={isActive ? "step" : undefined}
                className={[
                  "flex items-center gap-2 whitespace-nowrap outline-none transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  disabled
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums",
                    isActive
                      ? "border-foreground bg-inverse-bg text-inverse-fg"
                      : isDone
                        ? "border-foreground text-foreground"
                        : "border-border-soft",
                  ].join(" ")}
                >
                  {isDone ? <CheckMark /> : s}
                </span>
                <span className={`text-s ${isActive ? "font-bold" : ""}`}>{name}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
