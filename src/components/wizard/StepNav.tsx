"use client";

// [화면 뼈대 2026-08-18, 화면시나리오 v6.3 기능정의 2-1] 진행 표시는 5단계로 통합한다 —
// 입력 화면은 STEP 1-1·1-2·2·3-1·3-2·3-3 6종이지만, 상단 진행바는 01 공간·일정 / 02 구성·옵션 /
// 03 신청서 제출 / 04 심사 / 05 결과 안내 5개 그룹으로만 보여준다. 위저드 내부 스텝 번호(1~8)는
// 그대로 두고 이 그룹에 여러 개씩 묶는다 — 04 심사·05 결과 안내는 제출 이후 단계라 위저드
// 안에는 대응하는 화면이 없고, 그래서 항상 비활성(도달 불가)으로 표시된다.
interface StageGroup {
  label: string;
  steps: number[];
}

const STAGE_GROUPS: StageGroup[] = [
  { label: "01 공간 · 일정", steps: [1, 2] },
  { label: "02 구성 · 옵션", steps: [3] },
  { label: "03 신청서 제출", steps: [4, 5, 6, 7] },
  { label: "04 심사", steps: [] },
  { label: "05 결과 안내", steps: [] },
];

export function StepNav({
  step,
  maxUnlockedStep,
  hiddenSteps,
  onJump,
}: {
  step: number;
  maxUnlockedStep: number;
  hiddenSteps?: number[];
  onJump: (step: number) => void;
}) {
  return (
    <div className="sticky top-14 z-10 -mx-4 mb-8 flex h-11 items-center gap-1 overflow-x-auto border-b border-border bg-background px-4 sm:top-16 sm:-mx-6 sm:px-6">
      {STAGE_GROUPS.map((group) => {
        const visibleSteps = group.steps.filter((s) => !hiddenSteps?.includes(s));
        const entryStep = visibleSteps[0];
        const isActive = visibleSteps.includes(step);
        const disabled = entryStep === undefined || entryStep > maxUnlockedStep;
        return (
          <button
            key={group.label}
            type="button"
            disabled={disabled}
            onClick={() => entryStep !== undefined && onJump(entryStep)}
            className={[
              "shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium outline-none transition-colors",
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground",
              disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
            ].join(" ")}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}
