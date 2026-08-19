"use client";

// [화면 뼈대 2026-08-19, 개정] 진행 표시는 5개 그룹으로 묶는다 — 01 패키지 선택 /
// 02 일정 선택 / 03 구성·옵션 / 04 기본 정보(신청자 정보 → 관객 → 공공성) / 05 신청서
// 제출(예상 대관료 → 최종 제출). "패키지 선택"은 그룹 이름일 뿐, 실제 화면(STEP 1-1)은
// 시설·무대구성·규모를 입력하면 패키지가 자동으로 결정되는 구조다 — Package 1~4를 카드로
// 골라 클릭하는 화면은 없다(4개 패키지는 Bowl 사용료만 차등일 뿐 구성이 완전히 동일하다는
// 확정 사항 때문). "일정 선택"(캘린더)은 공간 선택과 별개 화면이라 1뎁스로 분리했다
// (2026-08-19). 위저드 내부 스텝 번호(1~8)는 그대로 두고 이 그룹에 여러 개씩 묶는다 —
// 04 기본 정보는 5(신청자 정보)·6(관객)·7(공공성)만, 05 신청서 제출은 4(예상 대관료)·
// 8(최종 제출)만 담아서 순번상 인접하지 않은 스텝을 한 그룹으로 묶는다(심사·결과 안내
// 그룹은 제거, 2026-08-19; 객석배치도/공공성 계획서 첨부 슬롯을 분리하며 관객·공공성도
// 별개 스텝으로 분리, 2026-08-19).
interface SubStep {
  step: number;
  label: string;
}

interface StageGroup {
  label: string;
  steps: SubStep[];
}

const STAGE_GROUPS: StageGroup[] = [
  { label: "01 패키지 선택", steps: [{ step: 1, label: "공간 선택" }] },
  { label: "02 일정 선택", steps: [{ step: 2, label: "일정 선택" }] },
  { label: "03 구성 · 옵션", steps: [{ step: 3, label: "구성 · 옵션" }] },
  {
    label: "04 기본 정보",
    steps: [
      { step: 5, label: "신청자 정보" },
      { step: 6, label: "관객" },
      { step: 7, label: "공공성" },
    ],
  },
  {
    label: "05 신청서 제출",
    steps: [
      { step: 4, label: "예상 대관료" },
      { step: 8, label: "최종 제출" },
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
