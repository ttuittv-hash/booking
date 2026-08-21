"use client";

// [화면 뼈대 2026-08-20, 세 번째 개정] "공간 선택"과 "일정 선택"을 다시 하나의 탭으로
// 합쳤다 — 화면 안에서는 두 슬롯(섹션)으로 나뉘어 보이지만 진행 표시상으로는 한 그룹
// "01 공간/일정"이다. 이용 시설(공간)을 먼저 고르면 그 아래 일정 슬롯(아레나 캘린더 /
// 중형 캘린더 / 동시 대관 탭)이 그 선택에 따라 달라진다. 관객 규모는 여전히 구성·옵션에서
// 입력한다.
// [개정 2026-08-21] 예전에는 위저드 내부 스텝 번호가 1(공간/일정)·2(구성·옵션)·
// 3(예상 대관료)·4~7(기본 정보)·8(최종 제출) 순이라, 구성·옵션에서 "다음"을 누르면
// 진행 표시가 "03 기본 정보"를 건너뛰고 곧장 "04 신청서 제출"로 넘어가 보이는 오류가
// 있었다("구성/옵션 -> 신청서 제출로 넘어가는 부분 오류.. 기본 정보로 넘어가야지"). 내부
// 스텝 번호 자체를 그룹 순서와 일치하도록 재배치해 3~6을 기본 정보(신청자 정보·관객·
// 공공성·안전관리 서약서), 7~8을 신청서 제출(예상 대관료·최종 제출)로 바꿨다.
interface SubStep {
  step: number;
  label: string;
}

interface StageGroup {
  label: string;
  steps: SubStep[];
}

const STAGE_GROUPS: StageGroup[] = [
  { label: "01 공간/일정", steps: [{ step: 1, label: "공간/일정" }] },
  { label: "02 구성 · 옵션", steps: [{ step: 2, label: "구성 · 옵션" }] },
  {
    label: "03 기본 정보",
    steps: [
      { step: 3, label: "신청자 정보" },
      { step: 4, label: "관객" },
      { step: 5, label: "공공성" },
      { step: 6, label: "안전관리 서약서" },
    ],
  },
  {
    label: "04 신청서 제출",
    steps: [
      { step: 7, label: "예상 대관료" },
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
