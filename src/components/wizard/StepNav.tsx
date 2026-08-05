"use client";

const STEP_NAMES = [
  "주차 선택",
  "규모/패키지",
  "기본 포함사항",
  "추가 옵션",
  "예상 대관료",
  "신청서",
];

/**
 * 스텝 인디케이터 — 샤프한 1px 타일.
 *   현재  = 옐로 면 + 검정 텍스트 (대비 14:1)
 *   완료  = 검정 보더
 *   미완료 = border-soft + muted
 *
 * 레이아웃 주의: 스텝 전환 시 위저드 폭이 흔들리던 버그(5cfc178 / 310e689)를
 * 다시 만들지 않기 위해, 음수 마진으로 그리드 트랙 밖으로 빼지 않고 컬럼 안에서
 * w-full + overflow-x-auto 로만 처리한다. (콘텐츠가 트랙 폭을 늘리면 안 된다)
 */
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
      // sticky 오프셋은 PublicHeader 높이(64 / lg 72)에 맞춘다.
      className="sticky top-16 z-20 mb-9 w-full border-b border-border/25 bg-background lg:top-[72px]"
    >
      <ol className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto py-3 sm:gap-2">
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
                  "flex h-9 items-center gap-2 whitespace-nowrap border px-2.5 outline-none transition-colors sm:px-3",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  isActive
                    ? "border-foreground bg-accent text-on-accent"
                    : isDone
                      ? "border-foreground bg-transparent text-foreground"
                      : "border-border-soft bg-transparent text-muted",
                  disabled
                    ? "cursor-not-allowed opacity-40"
                    : isActive
                      ? "cursor-pointer"
                      : "cursor-pointer hover:border-foreground hover:text-foreground",
                ].join(" ")}
              >
                <span className="type-display text-xs tabular-nums">
                  {String(s).padStart(2, "0")}
                </span>
                <span className="text-xs font-bold">{name}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
