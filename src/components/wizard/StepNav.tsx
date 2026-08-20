"use client";

/** 아레나 트랙 8단계. 중형공연장 일수 기준 트랙(7단계)은 9/1 범위다. */
const STEP_NAMES = [
  "공간 선택",
  "희망 주 선택",
  "규모·패키지 선택",
  "기본 포함사항",
  "추가 옵션",
  "예상 대관료",
  "공연 정보",
  "신청서 제출",
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
  onJump,
  trackName,
}: {
  step: number;
  maxUnlockedStep: number;
  onJump: (step: number) => void;
  /** 트랙명 — 트랙마다 총 단계 수가 다르므로 번호만 쓰면 어긋난다 */
  trackName?: string;
}) {
  const total = STEP_NAMES.length;
  return (
    <nav
      aria-label="신청 단계"
      // sticky 오프셋은 PublicHeader 높이(64 / lg 72)에 맞춘다.
      className="sticky top-16 z-20 mb-10 w-full border-b border-border/25 bg-background lg:top-[72px]"
    >
      {/*
        진행 표시 — 디자인 가이드 §5.9. 트랙 4px · 라운드 0 · 진행 막대는 검정 단색.
        옐로를 쓰지 않는다(옐로는 CTA 밴드 전용).
        라벨은 한글로 쓰고 트랙명을 함께 적는다. `Step 4/8` 같은 영문 표기를 쓰지 않는다.
      */}
      <div className="pt-4">
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
          aria-label={`${trackName ? `${trackName} · ` : ""}${step}/${total}단계 ${STEP_NAMES[step - 1]}`}
          className="h-1 w-full bg-[#eeeeee]"
        >
          <div
            className="h-1 bg-foreground transition-[width] duration-200"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-s">
          {trackName && <span className="text-muted">{trackName} · </span>}
          <span className="tabular-nums font-bold">
            {step}/{total}단계
          </span>{" "}
          <span className="text-muted">{STEP_NAMES[step - 1]}</span>
        </p>
      </div>

      <ol className="flex w-full min-w-0 items-center justify-start gap-x-5 gap-y-2 overflow-x-auto pb-4 pt-3 lg:flex-wrap lg:justify-start lg:overflow-visible">
        {STEP_NAMES.map((name, i) => {
          const s = i + 1;
          const isActive = s === step;
          const isDone = s < step;
          const disabled = s > maxUnlockedStep;
          return (
            <li key={name} className="shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onJump(s)}
                aria-current={isActive ? "step" : undefined}
                className={[
                  "flex items-center gap-2 whitespace-nowrap outline-none transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  disabled
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums",
                    isActive
                      ? "border-foreground bg-inverse-bg text-inverse-fg"
                      : isDone
                        ? "border-foreground text-foreground"
                        : "border-border-soft",
                  ].join(" ")}
                >
                  {isDone ? <CheckMark /> : s}
                </span>
                <span className={`text-s ${isActive ? "font-bold" : ""}`}>{name}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
