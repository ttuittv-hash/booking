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
    <nav
      aria-label="신청 단계"
      // sticky 오프셋은 상단바 높이 토큰(`--header-h`)을 그대로 따른다. 음수 마진(-mx-*)으로
      // 그리드 트랙 밖으로 빼지 않는다 — 스텝 전환 시 위저드 폭이 흔들리던 버그
      // (5cfc178 / 310e689) 가 그렇게 재발한다. w-full + overflow-x-auto 로만 처리한다.
      className="sticky top-[var(--header-h)] z-20 mb-10 w-full border-b border-border/25 bg-background"
    >
      <ol className="flex h-11 w-full min-w-0 items-center gap-1 overflow-x-auto">
        {groupsWithVisibleSteps.map((group) => {
          const entryStep = group.visibleSteps[0]?.step;
          const isActive = group.visibleSteps.some((s) => s.step === step);
          const disabled = entryStep === undefined || entryStep > maxUnlockedStep;
          return (
            <li key={group.label} className="shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => entryStep !== undefined && onJump(entryStep)}
                aria-current={isActive ? "step" : undefined}
                className={[
                  "whitespace-nowrap border-b-2 px-3 py-3 text-s font-medium outline-none transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  isActive
                    ? "border-foreground font-bold text-foreground"
                    : "border-transparent text-muted hover:text-foreground",
                  disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                ].join(" ")}
              >
                {group.label}
              </button>
            </li>
          );
        })}
      </ol>

      {activeGroup && activeGroup.visibleSteps.length > 1 && (
        <ol className="flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-3 pt-3">
          {activeGroup.visibleSteps.map((s, i) => {
            const isCurrent = s.step === step;
            const isDone = s.step < step;
            const disabled = s.step > maxUnlockedStep;
            return (
              <li key={s.step} className="flex shrink-0 items-center gap-2">
                {i > 0 && (
                  <span aria-hidden className="text-xs text-muted">
                    ›
                  </span>
                )}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onJump(s.step)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={[
                    // 터치로 누르는 칩이라 최소 높이를 확보한다. py-1 만으로는 24px 이라
                    // 손가락으로 정확히 짚기 어렵다(권장 44px).
                    "flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium outline-none transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                    isCurrent || isDone ? "border-foreground text-foreground" : "border-border-soft text-muted",
                    disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className={[
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
                      isCurrent
                        ? "bg-inverse-bg text-inverse-fg"
                        : isDone
                          ? "text-foreground"
                          : "text-muted",
                    ].join(" ")}
                  >
                    {isDone ? <CheckMark /> : i + 1}
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
