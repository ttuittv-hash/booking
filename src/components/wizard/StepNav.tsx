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
    <div className="mb-8 flex flex-wrap gap-2">
      {STEP_NAMES.map((name, i) => {
        const s = i + 1;
        const isActive = s === step;
        const isDone = s < step;
        const disabled = s > maxUnlockedStep;
        return (
          <button
            key={name}
            type="button"
            disabled={disabled}
            onClick={() => onJump(s)}
            className={[
              "flex items-center gap-2 rounded-sm border px-3.5 py-2 text-[13px] font-medium transition-colors",
              isActive
                ? "border-accent bg-accent-soft text-accent"
                : isDone
                  ? "border-border bg-panel text-foreground hover:border-accent/50"
                  : "border-border bg-panel text-muted",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            ].join(" ")}
          >
            <span
              className={[
                "grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold",
                isActive
                  ? "bg-accent text-white"
                  : isDone
                    ? "bg-good text-white"
                    : "bg-panel-strong text-muted",
              ].join(" ")}
            >
              {isDone ? "✓" : s}
            </span>
            {name}
          </button>
        );
      })}
    </div>
  );
}
