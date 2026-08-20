"use client";

// [화면 뼈대 2026-08-20, 개정] 진행 표시는 4개 그룹으로 묶는다 — 01 일정 선택 /
// 02 구성·옵션 / 03 기본 정보(신청자 정보 → 관객 → 공공성) / 04 신청서 제출(예상 대관료 →
// 최종 제출). 예전엔 "패키지 선택"(시설·무대구성·규모 입력) 화면이 맨 앞에 따로 있었지만,
// 일정을 먼저 고르는 흐름으로 바뀌면서 이용 시설 선택은 "일정 선택" 화면 맨 위로 옮기고
// 관객 규모는 "구성·옵션"으로 옮겨 별도 그룹을 없앴다(2026-08-20). 위저드 내부 스텝
// 번호(1~7)는 그대로 두고 이 그룹에 여러 개씩 묶는다 — 03 기본 정보는 4(신청자 정보)·
// 5(관객)·6(공공성)만, 04 신청서 제출은 3(예상 대관료)·7(최종 제출)만 담아서 순번상
// 인접하지 않은 스텝을 한 그룹으로 묶는다.
interface SubStep {
  step: number;
  label: string;
}

interface StageGroup {
  label: string;
  steps: SubStep[];
}

const STAGE_GROUPS: StageGroup[] = [
  { label: "01 일정 선택", steps: [{ step: 1, label: "일정 선택" }] },
  { label: "02 구성 · 옵션", steps: [{ step: 2, label: "구성 · 옵션" }] },
  {
    label: "03 기본 정보",
    steps: [
      { step: 4, label: "신청자 정보" },
      { step: 5, label: "관객" },
      { step: 6, label: "공공성" },
    ],
  },
  {
    label: "04 신청서 제출",
    steps: [
      { step: 3, label: "예상 대관료" },
      { step: 7, label: "최종 제출" },
    ],
  },
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
  const groupsWithVisibleSteps = STAGE_GROUPS.map((group) => ({
    ...group,
    visibleSteps: group.steps.filter((s) => !hiddenSteps?.includes(s.step)),
  }));
  const activeGroup = groupsWithVisibleSteps.find((g) => g.visibleSteps.some((s) => s.step === step));

  return (
    <div className="sticky top-14 z-10 -mx-4 mb-8 border-b border-border bg-background sm:top-16">
      <div className="flex h-11 items-center gap-1 overflow-x-auto px-4 sm:px-6">
        {groupsWithVisibleSteps.map((group) => {
          const entryStep = group.visibleSteps[0]?.step;
          const isActive = group.visibleSteps.some((s) => s.step === step);
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

      {activeGroup && activeGroup.visibleSteps.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 pt-3 sm:px-6">
          {activeGroup.visibleSteps.map((s, i) => {
            const isCurrent = s.step === step;
            const isDone = s.step < step;
            const disabled = s.step > maxUnlockedStep;
            return (
              <div key={s.step} className="flex shrink-0 items-center gap-2">
                {i > 0 && <span className="text-[11px] text-muted">›</span>}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onJump(s.step)}
                  className={[
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                    isCurrent
                      ? "border-accent bg-accent-soft text-accent"
                      : isDone
                        ? "border-border bg-panel text-foreground hover:border-accent/50"
                        : "border-border bg-transparent text-muted",
                    disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]",
                      isCurrent
                        ? "bg-accent text-white"
                        : isDone
                          ? "bg-accent/70 text-white"
                          : "bg-border text-muted",
                    ].join(" ")}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  {s.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
