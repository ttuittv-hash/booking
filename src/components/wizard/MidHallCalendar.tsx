"use client";

import { btnClass, ICON_BTN_SM, toggleClass } from "@/components/ui/kit";

import { useState } from "react";
import { isoDate, isWeekendDate } from "@/lib/pricing/dateRange";
import { canStepMonth, toMonthKey } from "@/lib/content/noticeCalendarWindow";
import type {
  DateBlock,
  MidHallDayRole,
  MidHallDaySelection,
} from "@/lib/pricing/types";

function toColumnIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

// 역할 선택 팝오버의 고정 폭(7칸 중 몇 칸) — Step1Calendar.tsx의 POPOVER_SPAN과 같은 이유.
// [수정 2026-09-08] "레이어 길이를 적당히 고정하고 날짜 선택 시점 기준으로 노출해야지"
// — 4칸도 너무 넓어서 화~토(8-4=4번째 칸부터) 대부분 오른쪽 끝에 붙어 보였다. 준비·
// 공연일·철수 버튼 3개가 필요한 만큼만 차지하도록 좁혔다.
const POPOVER_SPAN = 3;

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}(${WEEKDAY_SHORT[new Date(iso).getDay()]})`;
}

function buildMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstCol = toColumnIndex(firstOfMonth.getDay());
  const gridStart = new Date(year, month - 1, 1 - firstCol);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      days.push(date);
    }
    weeks.push(days);
  }
  return weeks;
}

function roleTag(role: MidHallDayRole, shows: number): string {
  if (role === "SETUP") return "준비";
  if (role === "LOAD_OUT") return "철수";
  return `공연${shows > 1 ? `×${shows}` : ""}`;
}

export function MidHallCalendar({
  title,
  year,
  month,
  days,
  extraSetupHours,
  extraLoadOutHours,
  dateBlocks,
  onChangeMonth,
  onChangeDays,
  monthBounds,
  outOfRangeDates = [],
}: {
  title?: string;
  year: number;
  month: number;
  days: Record<string, MidHallDaySelection>;
  // [수정 2026-09-08] "철수/준비 때 시간별로 수정하는 기능 자체를 삭제해" — 이 값을
  // 바꾸는 UI는 없앴고, 요약 줄(아래 "· 준비연장 N시간" 등)에 읽기 전용으로만 쓴다.
  extraSetupHours: number;
  extraLoadOutHours: number;
  dateBlocks: DateBlock[];
  onChangeMonth: (year: number, month: number) => void;
  onChangeDays: (days: Record<string, MidHallDaySelection>) => void;
  /** [신규 2026-09-06] Step1Calendar.tsx와 같은 어드민 「공지 캘린더 노출 월」 범위. */
  monthBounds?: { start: string | null; end: string | null };
  /**
   * [신규 2026-09-08] "동시대관은 동일 기간에만 세팅 가능하다는 안내가 들어가야함" —
   * 아레나 공연 일정 범위를 벗어난 중형 선택 날짜(ISO). WizardShell이
   * midHallDatesOutsideArenaRange로 미리 계산해 넘긴다 — 이 컴포넌트는 아레나 쪽
   * 선택 상태를 몰라도 되게 결과만 받는다. 중형 단독 예약(동시 대관 아님)이면 항상
   * 빈 배열이 넘어온다.
   */
  outOfRangeDates?: string[];
}) {
  // [화면 뼈대 2026-08-19, 아레나 STEP 2(Step1Calendar)와 동일 구조] 역할 지정은 날짜 아래에
  // 바로 펼쳐지는 인라인 드롭다운으로 처리한다 — 클릭 즉시 기본값(공연일)으로 토글하고 별도
  // 목록에서 편집하던 이전 방식은 "날짜 자체에서 준비"하는 아레나 캘린더 구조와 어긋나서
  // 통일한다.
  const [openDate, setOpenDate] = useState<string | null>(null);
  const outOfRangeSet = new Set(outOfRangeDates);

  const weeks = buildMonthGrid(year, month);
  // 중형공연장 전용 설정 또는 공간공통(ALL, 과거 이관 데이터)만 이 화면에 적용한다 —
  // 아레나 전용으로 막힌 날짜는 중형공연장에서는 그대로 선택 가능해야 한다.
  const blockedByDate = new Map(
    dateBlocks
      .filter((b) => b.venueId === "medium-hall" || b.venueId === "ALL")
      .map((b) => [b.date, b]),
  );
  const today = new Date();
  const selectedDates = Object.keys(days).sort();
  const setupCount = selectedDates.filter(
    (d) => days[d].role === "SETUP",
  ).length;
  const loadOutDayCount = selectedDates.filter(
    (d) => days[d].role === "LOAD_OUT",
  ).length;
  const performanceDates = selectedDates.filter(
    (d) => days[d].role === "PERFORMANCE",
  );
  const showCount = performanceDates.reduce((sum, d) => sum + days[d].shows, 0);

  function canGoToMonth(delta: -1 | 1): boolean {
    if (!monthBounds) return true;
    return canStepMonth(toMonthKey(year, month), delta, monthBounds);
  }

  function goToMonth(delta: -1 | 1) {
    if (!canGoToMonth(delta)) return;
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    onChangeMonth(nextYear, nextMonth);
  }

  function setRole(iso: string, role: MidHallDayRole) {
    const current = days[iso];
    onChangeDays({
      ...days,
      [iso]: {
        role,
        shows: role === "PERFORMANCE" ? (current?.shows ?? 1) : 1,
      },
    });
  }

  function setShows(iso: string, shows: number) {
    const current = days[iso];
    if (!current) return;
    onChangeDays({
      ...days,
      [iso]: { ...current, shows: Math.max(1, Math.min(4, shows)) },
    });
  }

  function removeDate(iso: string) {
    const next = { ...days };
    delete next[iso];
    onChangeDays(next);
    setOpenDate(null);
  }

  return (
    <div>
      {title && <h3 className="type-kr-heading text-h6-m">{title}</h3>}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          disabled={!canGoToMonth(-1)}
          aria-label="이전 달"
          className={`${toggleClass(false)} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          ‹
        </button>
        <div className="type-kr-heading text-h6-m">
          {year}년 {month}월
        </div>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          disabled={!canGoToMonth(1)}
          aria-label="다음 달"
          className={`${toggleClass(false)} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted sm:gap-1.5">
        {DOW_LABELS.map((label, i) => (
          <div key={label} className={i === 5 || i === 6 ? "opacity-70" : ""}>
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1.5 space-y-1 sm:space-y-1.5">
        {weeks.map((weekDays, wi) => {
          const openInThisRow =
            openDate && weekDays.some((d) => isoDate(d) === openDate);
          return (
            // [수정 2026-09-08] "레이어가 달력을 덮으면 되는데.. 지금은 날짜를 레이어가
            // 밀어내는 구조야" — Step1Calendar.tsx와 동일 이유로 relative 위치 기준을
            // 둔다(팝오버를 absolute 로 띄워 다음 주 행을 밀지 않게 한다).
            <div key={wi} className="relative">
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {weekDays.map((date) => {
                  const inMonth = date.getMonth() === month - 1;
                  const iso = isoDate(date);
                  const isToday = isoDate(today) === iso;
                  const selection = days[iso];
                  const blocked = blockedByDate.get(iso);
                  const interactable = inMonth && !blocked;
                  // [신규 2026-09-08] "동시대관은 동일 기간에만 세팅 가능" — 아레나 공연
                  // 일정 범위를 벗어난 날짜에 역할을 잡으면 빨간 테두리로 바로 보이게 한다.
                  const outOfRange = inMonth && outOfRangeSet.has(iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={!interactable}
                      onClick={() => setOpenDate(openDate === iso ? null : iso)}
                      className={[
                        "flex h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors sm:h-16",
                        !inMonth
                          ? "cursor-default text-transparent"
                          : blocked
                            ? "cursor-not-allowed text-muted line-through"
                            : selection
                              ? "cursor-pointer bg-accent-soft font-bold text-foreground"
                              : "cursor-pointer text-foreground hover:bg-panel",
                        isToday
                          ? "underline decoration-2 underline-offset-4"
                          : "",
                        openDate === iso ? "ring-2 ring-accent" : "",
                        outOfRange
                          ? "outline outline-2 -outline-offset-2 outline-danger"
                          : "",
                      ].join(" ")}
                    >
                      <span>{date.getDate()}</span>
                      {inMonth && selection && (
                        <span className="text-xs font-bold">
                          {roleTag(selection.role, selection.shows)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {openInThisRow && openDate && (
                // [수정 2026-09-07] "날짜 선택하면 나오는 레이어가 너무 가로로 길어...
                // 선택날짜 부터 레이어가 커져야해" — 위 날짜 그리드와 같은 grid-cols-7
                // 트랙에 맞춰, 고른 날짜의 칸부터 펼친다.
                // [수정 2026-09-07] "고정축을 오른쪽으로 두면... 가로 길이 값을 고정으로
                // 둬야지" — 마지막 칸 근처를 클릭하면 폭이 1칸으로 쪼그라들어 버튼
                // 라벨이 줄바꿈되는 문제가 있었다. 폭은 항상 POPOVER_SPAN 칸으로 고정하고
                // 시작 칸만 오른쪽 끝을 넘지 않게 당긴다(Step1Calendar.tsx와 동일 로직).
                // [수정 2026-09-08] "레이어가 달력을 덮으면 되는데.. 지금은 날짜를
                // 레이어가 밀어내는 구조야" — absolute + top-full 로 이 주 행 바로
                // 아래에 띄워 다음 주 행을 밀지 않고 그 위에 겹쳐 보이게 한다.
                <div className="absolute inset-x-0 top-full z-20 mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
                  <div
                    className="border border-border/40 bg-surface px-3 py-2.5 shadow-lg"
                    style={{
                      gridColumn: (() => {
                        const dayCol =
                          weekDays.findIndex((d) => isoDate(d) === openDate) +
                          1;
                        const start = Math.max(
                          1,
                          Math.min(dayCol, 8 - POPOVER_SPAN),
                        );
                        return `${start} / ${start + POPOVER_SPAN}`;
                      })(),
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-foreground">
                        {formatDateLabel(openDate)}
                        {isWeekendDate(openDate) ? (
                          <span className="ml-1 font-normal text-muted">
                            · 주말
                          </span>
                        ) : null}
                        {" — 역할 선택"}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenDate(null)}
                        aria-label="닫기"
                        className="text-xs text-muted hover:text-foreground"
                      >
                        닫기 ✕
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRole(openDate, "SETUP")}
                        className={[
                          "inline-flex h-8 items-center border px-3 text-xs font-bold transition-colors",
                          days[openDate]?.role === "SETUP"
                            ? "border-foreground bg-inverse-bg text-inverse-fg"
                            : "border border-border/25 text-muted hover:border-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        준비
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole(openDate, "PERFORMANCE")}
                        className={[
                          "inline-flex h-8 items-center border px-3 text-xs font-bold transition-colors",
                          days[openDate]?.role === "PERFORMANCE"
                            ? "border-foreground bg-inverse-bg text-inverse-fg"
                            : "border border-border/25 text-muted hover:border-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        공연일
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole(openDate, "LOAD_OUT")}
                        className={[
                          "inline-flex h-8 items-center border px-3 text-xs font-bold transition-colors",
                          days[openDate]?.role === "LOAD_OUT"
                            ? "border-foreground bg-inverse-bg text-inverse-fg"
                            : "border border-border/25 text-muted hover:border-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        철수
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDate(openDate)}
                        disabled={!days[openDate]}
                        className={btnClass("danger", "sm")}
                      >
                        삭제
                      </button>
                    </div>
                    {days[openDate]?.role === "PERFORMANCE" && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-foreground/20 pt-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">공연 회차</span>
                          <button
                            type="button"
                            onClick={() =>
                              setShows(
                                openDate,
                                (days[openDate]?.shows ?? 1) - 1,
                              )
                            }
                            className={ICON_BTN_SM}
                          >
                            −
                          </button>
                          <span className="w-4 text-center text-xs font-bold tabular-nums">
                            {days[openDate]?.shows ?? 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setShows(
                                openDate,
                                (days[openDate]?.shows ?? 1) + 1,
                              )
                            }
                            className={ICON_BTN_SM}
                          >
                            +
                          </button>
                          <span className="text-xs text-muted">회차</span>
                        </div>
                      </div>
                    )}
                    {/* [삭제 2026-09-08] "철수/준비 때 시간별로 수정하는 기능 자체를
                        삭제해" — 준비 연장(22:00~24:00)·철수 Load-Out 연장을 +/-로
                        조정하던 스테퍼를 없앤다. 이미 저장된 값(옛 신청서)은 그대로
                        읽어 견적·요약 줄에 계속 반영되지만, 새로 이 값을 만드는 UI는
                        더 이상 없다. */}
                    {/* [삭제 2026-09-08] "중형 공연장 단가가 잘못 들어가있어. 단가 부분
                        삭제해" — 이 칸에 참고용으로 보여주던 "단가 N원[× 할증]" 줄을
                        없앴다. 실제 금액은 예상 대관료/실시간 패널에서 확인한다. */}
                    {(!days[openDate] ||
                      (days[openDate].role === "PERFORMANCE" &&
                        days[openDate].shows >= 3)) && (
                      <p className="mt-2 text-xs text-muted">
                        {!days[openDate] ? (
                          "준비 또는 공연일을 선택하면 날짜가 추가됩니다."
                        ) : (
                          <span className="text-muted-strong">
                            1일 {days[openDate].shows}회 — 운영자 확인 필요(자동
                            계산 제외)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-5 text-s font-bold text-foreground">
          선택 일자 {selectedDates.length}일(비연속 가능) · 준비 {setupCount}일
          · 공연 {performanceDates.length}일 · 회차 합계 {showCount}
          {loadOutDayCount > 0 && ` · 철수 ${loadOutDayCount}일`}
          {extraSetupHours > 0 && ` · 준비연장 ${extraSetupHours}시간`}
          {extraLoadOutHours > 0 && ` · 철수연장 ${extraLoadOutHours}시간`}
        </div>
      )}

      {/* [신규 2026-09-08] "동시대관은 동일 기간에만 세팅 가능하다는 안내가 들어가야함" —
          범위를 벗어난 날짜를 구체적으로 짚어준다(토스트만으로는 어느 날짜가 문제인지
          화면에서 바로 안 보였다). */}
      {outOfRangeDates.length > 0 && (
        <div className="mt-3 flex gap-2 border border-danger bg-danger-soft px-3 py-2.5 text-xs leading-6 text-muted-strong">
          <span className="mt-0.5 shrink-0 font-bold text-danger">!</span>
          <span>
            <b className="text-danger">
              동시 대관의 경우, 아레나 공연 일정 내에서 중형공연장 일정 세팅이
              가능합니다.
            </b>
            <br />
            범위를 벗어난 날짜:{" "}
            {outOfRangeDates.map((d) => formatDateLabel(d)).join(", ")}
          </span>
        </div>
      )}

      {/* [삭제 2026-09-08] "노란색 표기 문구 삭제.. 중형탭 선택시 하단 문구" — 대관료
          포함 항목·브레이크타임 안내 문단을 뺐다. */}
    </div>
  );
}
