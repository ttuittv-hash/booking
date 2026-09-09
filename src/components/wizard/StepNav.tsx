"use client";

import { useWizardText } from "@/lib/content/wizardText";

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

// [수정 2026-09-06] "원뎁스 메뉴와 투뎁스 메뉴명 모두를 수정할 수 있게" — 예전엔
// 이 배열이 모듈 최상위 상수라 useWizardText() 를 쓸 수 없었다. 컴포넌트 안에서
// tStr(key, fallback)을 받아 조립하는 함수로 바꾼다 — key 는 /admin/content
// "위저드 문구 미리보기·수정" 화면에서 이 화면을 그대로 보며 고칠 수 있다.
function buildStageGroups(tStr: (key: string, fallback: string) => string): StageGroup[] {
  return [
    {
      label: tStr("stepNav.group.spaceSchedule", "01 공간/일정"),
      steps: [{ step: 1, label: tStr("stepNav.step.spaceSchedule", "공간/일정") }],
    },
    {
      label: tStr("stepNav.group.configOptions", "02 구성 · 옵션"),
      steps: [{ step: 2, label: tStr("stepNav.step.configOptions", "구성 · 옵션") }],
    },
    {
      label: tStr("stepNav.group.basicInfo", "03 기본 정보"),
      steps: [
        { step: 3, label: tStr("stepNav.step.applicantInfo", "신청자 정보 및 규모") },
        { step: 4, label: tStr("stepNav.step.marketing", "홍보 및 서비스 계획") },
        // [이동 2026-09-08] STEP 5(공공/공익 참여)는 STEP 4(홍보 및 서비스 계획) 안으로
        // 합쳤다(nora, 9/8 16:20). 단계 번호는 그대로 두고(임시저장·검증 키 유지) 탭에서만
        // 빼며, WizardShell.goTo 가 5를 건너뛴다.
        { step: 6, label: tStr("stepNav.step.safetyPledge", "안전관리 서약서") },
        // [신규 2026-09-07] "안전관리 서약서 뒤에 자료 첨부 탭 신규 생성" — 안전관리
        // 서약서 탭의 두 번째 슬롯이던 자료 첨부를 독립 탭으로 뗐다.
        { step: 7, label: tStr("stepNav.step.attachments", "자료 첨부") },
      ],
    },
    {
      label: tStr("stepNav.group.submit", "04 신청서 제출"),
      steps: [
        { step: 8, label: tStr("stepNav.step.estimate", "예상 대관료") },
        { step: 9, label: tStr("stepNav.step.finalSubmit", "최종 제출") },
      ],
    },
  ];
}

/**
 * 요약 패널(사이드바)을 **단계 바 아래 선에 맞추는** 오프셋.
 *
 * 단계 바는 본문 칼럼 **안**에 있어야 sticky 가 작동한다 — 그리드의 한 줄로 올리면
 * 그 행 높이가 곧 자기 높이라 이동 범위가 0 이 되어 스크롤해도 붙지 않는다. 그래서
 * 사이드바를 이만큼 내려 윗변을 맞춘다(스크롤 전에도 두 축이 한 줄에서 시작한다).
 *
 * 값은 **단계 바 자체의 높이**다 — 아래 여백(`mb-10`)은 본문이 내려가는 몫이므로
 * 여기 더하지 않는다(더했다가 사이드바가 40 더 내려가 어긋났다).
 *
 *   상위 줄만    ol h-12(48) + border-b(1)                        = 49
 *   하위 줄까지  48 + pt-5(20) + h-8(32) + pb-3(12) + border-b(1) = 113
 */
export const STEP_NAV_OFFSET = { single: "lg:mt-[49px]", grouped: "lg:mt-[113px]" } as const;

/** 하위 단계가 둘 이상인 그룹의 첫 step — 03 기본 정보(3~7) · 04 신청서 제출(8~9) */
export const SUB_ROW_FROM_STEP = 3;

/** 하위 단계 사이의 셰브런 — 이것들이 나란한 버튼이 아니라 순서라는 표시 */
function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-muted">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

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
  const { tStr } = useWizardText();
  const STAGE_GROUPS = buildStageGroups(tStr);
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
        [복원 2026-09-10] 위쪽을 **불투명한 지면으로 덮는다**(`before:`). 상단바는
        아랫변이 투명으로 빠지는 페이드라, 이 줄이 상단바 바로 아래에 붙어 있으면
        그 페이드 구간(= `--header-h` 높이)으로 **본문이 비쳐 올라온다** — 글이 촘촘한
        위저드에서는 앞 단계 제목이 상단바를 뚫고 나온 것처럼 보였다.
        여기서는 페이드 대신 불투명한 면으로 덮는다.
      */
      className="sticky top-[var(--header-h)] relative z-20 mb-10 w-full border-b border-border/25 bg-background before:absolute before:inset-x-0 before:bottom-full before:h-[var(--header-h)] before:bg-background before:content-['']"
    >
      {/*
        높이를 자식 버튼(h-12)과 **같게** 맞춘다. h-11 이던 동안 4px 이 넘쳐,
        `overflow-x: auto` 가 세로쪽도 auto 로 계산되면서 **상하 스크롤바가 떴다**.
        가로 스크롤은 좁은 화면에서 필요하므로 남기고 스크롤바만 숨긴다.

        항목 사이 간격은 버튼에서 좌우 패딩을 뺀 만큼 `gap` 으로 옮겼다(4+12+12 = 28)
        — 그래야 **첫 글자가 지면 왼쪽 끝**에서 시작해 아래 하위 단계와 축이 맞는다.
      */}
      <ol className="flex h-12 w-full min-w-0 items-center gap-7 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  // 좌우 패딩을 두지 않는다 — 글자가 왼쪽 끝에서 시작하고, 밑줄도 글자 폭에 딱 맞는다
                  "flex h-12 items-center whitespace-nowrap border-b-2 text-s font-bold outline-none transition-colors",
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
        // [수정 2026-09-06] "원뎁스 투뎁스 간격이 너무 좁아서 붙으려고 하고" — 위 그룹
        // 줄과 바로 붙어 있던 pt-3를 pt-5로 넉넉히 띄운다. "투뎁스는 동그라미 말고
        // 텍스트 밑줄로" — 알약(rounded-full·테두리) 버튼을 밑줄 텍스트로 바꾼다.
        <ol className="flex w-full min-w-0 items-center gap-3 overflow-x-auto pb-3 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeGroup.visibleSteps.map((s, i) => {
            const isCurrent = s.step === step;
            const isDone = s.step < step;
            const disabled = s.step > maxUnlockedStep || (locked && s.step !== step);
            return (
              <li key={s.step} className="flex shrink-0 items-center gap-3">
                {i > 0 && <Chevron />}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onJump(s.step)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={[
                    /*
                      [개정 2026-09-09] 하위 단계는 **밑줄을 두지 않고 색으로만** 구분한다 —
                      현재 검정 / 지나온 단계 진한 회색(#666) / 남은 단계 옅은 회색(#AAA).
                      밑줄 두 가지(현재 2px · 완료 1px)로 가르던 동안, 굵기 차이가 미세해
                      어디까지 왔는지 한눈에 읽히지 않았다. 색은 세 단이 확실히 갈린다.
                      `opacity-40` 도 뺐다 — 색이 이미 상태를 말하므로 겹치면 남은 단계가
                      읽히지 않을 만큼 옅어진다.
                    */
                    "flex h-8 items-center whitespace-nowrap text-xs font-bold outline-none transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                    isCurrent
                      ? "text-foreground"
                      : isDone
                        ? "text-muted hover:text-foreground"
                        : "text-n-light hover:text-foreground",
                    disabled ? "cursor-not-allowed" : "cursor-pointer",
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
