"use client";

const STEP_NAMES = [
  "주차 선택",
  "규모/패키지",
  "기본 포함사항",
  "추가 옵션",
  "예상 대관료",
  "신청서",
];

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
    <div className="sticky top-14 z-10 -mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-border bg-background px-4 sm:top-16 sm:-mx-6 sm:px-6">
      {STEP_NAMES.map((name, i) => {
        const s = i + 1;
        const isActive = s === step;
        const disabled = s > maxUnlockedStep;
        return (
          <button
            key={name}
            type="button"
            disabled={disabled}
            onClick={() => onJump(s)}
            className={[
              "shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium transition-colors",
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground",
              disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
            ].join(" ")}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
