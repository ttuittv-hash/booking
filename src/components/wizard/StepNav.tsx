"use client";

import type { ReactNode } from "react";
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
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3 w-3">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 하위 단계 사이의 셰브런 — 이것들이 나란한 버튼이 아니라 순서라는 표시 */
function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-muted">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

/**
 * 단계 번호 — 원 안의 숫자.
 *
 * 알약 안에 번호를 그냥 텍스트로 두면 라벨과 두 개의 글자 덩어리가 되어 줄이 맞지
 * 않는다(그리고 옆 버튼들과 똑같이 보인다). 번호는 항상 20px 원 안에 넣는다.
 */
function StepBullet({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current type-display text-xs leading-none tabular-nums"
    >
      {children}
    </span>
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
            const disabled = s.step > maxUnlockedStep;
            return (
              <li key={s.step} className="flex shrink-0 items-center gap-1.5">
                {i > 0 && <Chevron />}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onJump(s.step)}
                  aria-current={isCurrent ? "step" : undefined}
                  /* 현재 단계 = 검정 채움. 안쪽 번호 원·체크가 따라오도록 토큰을 국소 반전한다 */
                  style={isCurrent ? CHOICE_SELECTED_VARS : undefined}
                  className={[
                    // 하위 단계는 **알약**이다 — 네모는 실행(버튼), 알약은 이동(탭)이라는
                    // 구분을 지킨다. 샤프 코너로 두면 바로 아래 이전/다음 버튼과 같은
                    // 모양이 되어 "누르면 뭔가 실행되는 것"으로 읽힌다.
                    // 높이는 버튼과 같은 단(40)을 쓴다.
                    "flex h-10 items-center gap-2 rounded-full border pl-2.5 pr-4 text-xs font-bold outline-none transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                    isCurrent
                      ? "border-foreground bg-inverse-bg text-inverse-fg"
                      : isDone
                        ? "border-foreground text-foreground"
                        : "border-border-soft text-muted",
                    disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                  ].join(" ")}
                >
                  <StepBullet>{isDone ? <CheckMark /> : i + 1}</StepBullet>
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
