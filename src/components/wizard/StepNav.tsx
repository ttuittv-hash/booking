"use client";

import { CHOICE_SELECTED_VARS } from "@/components/ui/kit";

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
// [개정 2026-08-23] "신청자 정보"·"규모" 두 하위 탭을 STEP 3 하나로 합쳤다
// ("신청자 정보 탭을 신청자 정보 및 규모로 변경하고, 규모 탭 내역을 합쳐") — 그만큼
// 기본 정보 그룹의 나머지 스텝 번호가 하나씩 당겨진다.
// [개정 2026-08-27] 기본 정보 그룹 안에서 홍보와 공공/공익의 순서를 맞바꿨다(시안 지시:
// "신청자 정보 및 규모 > 홍보 및 마케팅 > 공공/공익(부대사업) > 안전관리 서약서"). 필수인
// 홍보 계획이 선택 항목인 공공/공익 뒤에 있어, 선택 화면을 지나야 필수 화면이 나오는
// 순서였다. 게이트도 같이 옮겼다 — WizardShell 의 step4Blocked 참고.
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
      { step: 3, label: "신청자 정보 및 규모" },
      { step: 4, label: "홍보 및 서비스 계획" },
      { step: 5, label: "공공/공익 참여 여부" },
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
/** 하위 단계 사이의 셰브런 — 이것들이 나란한 버튼이 아니라 순서라는 표시 */
function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-muted">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

export function StepNav({
  step,
  maxUnlockedStep,
  hiddenSteps,
  locked,
  onJump,
}: {
  step: number;
  maxUnlockedStep: number;
  hiddenSteps?: number[];
  /** 최종 제출까지 마친 뒤에는 "수정하기"를 누르기 전까지 다른 단계로 못 옮긴다(2026-08-22). */
  locked?: boolean;
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
      /*
        단계 바 **위쪽(상단바 자리)까지 지면색으로 막는다**(`before`).
        상단바 배경은 아랫변으로 갈수록 옅어지는 페이드라, 그 구간으로 아래 내용이
        비쳐 올라왔다 — 글이 촘촘한 위저드에서는 체크박스 줄이 상단바를 뚫고 나온 것처럼
        보였다. 여기서는 페이드 대신 불투명한 면으로 덮는다.
      */
      className="sticky top-[var(--header-h)] z-20 w-full relative border-b border-border/25 bg-background before:absolute before:inset-x-0 before:bottom-full before:h-[var(--header-h)] before:bg-background before:content-['']"
    >
      <ol className="flex h-11 w-full min-w-0 items-center gap-1 overflow-x-auto">
        {groupsWithVisibleSteps.map((group) => {
          const entryStep = group.visibleSteps[0]?.step;
          const isActive = group.visibleSteps.some((s) => s.step === step);
          const disabled =
            entryStep === undefined || entryStep > maxUnlockedStep || (locked && entryStep !== step);
          return (
            <li key={group.label} className="shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => entryStep !== undefined && onJump(entryStep)}
                aria-current={isActive ? "step" : undefined}
                className={[
                  "flex h-12 items-center whitespace-nowrap border-b-2 px-3 text-s font-bold outline-none transition-colors",
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
        <ol className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto pb-3 pt-3">
          {activeGroup.visibleSteps.map((s, i) => {
            const isCurrent = s.step === step;
            const isDone = s.step < step;
            const disabled = s.step > maxUnlockedStep || (locked && s.step !== step);
            return (
              <li key={s.step} className="flex shrink-0 items-center gap-1.5">
                {i > 0 && <Chevron />}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onJump(s.step)}
                  aria-current={isCurrent ? "step" : undefined}
                  /* 현재 단계 = 검정 채움. 텍스트 색이 따라오도록 토큰을 국소 반전한다 */
                  style={isCurrent ? CHOICE_SELECTED_VARS : undefined}
                  className={[
                    // 하위 단계는 **알약**이다 — 네모는 실행(버튼), 알약은 이동(탭)이라는
                    // 구분을 지킨다. 샤프 코너로 두면 바로 아래 이전/다음 버튼과 같은
                    // 모양이 되어 "누르면 뭔가 실행되는 것"으로 읽힌다.
                    // 높이는 버튼과 같은 단(40)을 쓴다. 번호 매김은 제거했다(2026-08-22,
                    // "서브위저드 번호는 제거해") — 순서는 셰브런과 완료/진행 색으로만 표시한다.
                    "flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold outline-none transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                    isCurrent
                      ? "border-foreground bg-inverse-bg text-inverse-fg"
                      : isDone
                        ? "border-foreground text-foreground"
                        : "border-border-soft text-muted",
                    disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                  ].join(" ")}
                >
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
