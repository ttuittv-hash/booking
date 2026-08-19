"use client";

import {
  EVENT_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  type BookingMode,
  type EventType,
  type PerformanceInfo,
  type StageType,
} from "@/lib/pricing/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[];
const STAGE_TYPES = Object.keys(STAGE_TYPE_LABEL) as StageType[];

// [화면 뼈대 2026-08-19, 화면시나리오 STEP 1-1] 이용 시설은 "메인 아레나 / 중형공연장 /
// 동시 대관" 3개 중 하나만 고르는 토글 버튼이다 — 라디오+체크박스 조합(중복 체크로
// 오인되던 구조)이 아니라 셋이 동등한 배타적 선택지다. 동시 대관을 고르면 아레나가
// 기준(anchor)이 되므로 venueId는 항상 "arena"로 고정한다(2단계 캘린더의 "동시 대관에서는
// 아레나를 먼저 확정합니다" 흐름과 일치). venueId가 아직 null이면(첫 진입) 셋 다 비활성
// 상태로 보여준다.
function primaryVenueOf(venueId: string | null, bookingMode: BookingMode): "arena" | "medium-hall" | null {
  if (bookingMode === "SIMULTANEOUS") return "arena";
  if (!venueId) return null;
  return venueId === "medium-hall" ? "medium-hall" : "arena";
}

export function StepVenue({
  venueId,
  bookingMode,
  expectedAudience,
  secondaryAudience,
  performanceInfo,
  onSelectVenue,
  onChangeAudience,
  onChangeSecondaryAudience,
  onChangePerformanceInfo,
}: {
  venueId: string | null;
  bookingMode: BookingMode;
  expectedAudience: number;
  secondaryAudience: number;
  performanceInfo: PerformanceInfo;
  onSelectVenue: (venueId: string, bookingMode: BookingMode) => void;
  onChangeAudience: (value: number) => void;
  onChangeSecondaryAudience: (value: number) => void;
  onChangePerformanceInfo: (info: PerformanceInfo) => void;
}) {
  const isSimultaneous = bookingMode === "SIMULTANEOUS";
  const primaryVenue = primaryVenueOf(venueId, bookingMode);
  const hasSelection = !!venueId;

  function setInfo<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChangePerformanceInfo({ ...performanceInfo, [key]: value });
  }

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">어떤 공연을 준비하고 계신가요?</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        시설 · 무대 구성 · 규모를 먼저 고르면 아래에서 공간 정보에 맞는 예상 대관료 산정이
        시작됩니다. 다음 화면에서 일정을 선택합니다.
      </p>

      <div className="mt-6 divide-y divide-border">
        <div className="py-5 first:pt-0">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <label className="w-28 shrink-0 text-[13px] font-medium text-foreground">이용 시설 *</label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "arena", label: "메인 아레나", active: primaryVenue === "arena" && !isSimultaneous, onClick: () => onSelectVenue("arena", "SINGLE") },
                  { key: "medium-hall", label: "중형공연장", active: primaryVenue === "medium-hall" && !isSimultaneous, onClick: () => onSelectVenue("medium-hall", "SINGLE") },
                  { key: "simultaneous", label: "동시 대관", active: isSimultaneous, onClick: () => onSelectVenue("arena", "SIMULTANEOUS") },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={opt.onClick}
                  className={[
                    "rounded-sm border px-3.5 py-2 text-[13px] font-medium transition-colors",
                    opt.active
                      ? "border-accent bg-accent-soft text-foreground"
                      : "border-border bg-panel text-muted hover:border-accent/50",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 pl-0 text-[11.5px] leading-5 text-muted sm:pl-[7.5rem]">
            동시 대관은 두 공간을 신청서 1건으로 묶어 신청하는 것이며, 두 공간은 완전히
            분리되어 있어 <b className="text-foreground">할인은 없습니다</b> — 금액은 각 공간을
            따로 신청했을 때와 같습니다.
          </p>
        </div>

        {primaryVenue === "arena" && (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-5">
            <label className="w-28 shrink-0 text-[13px] font-medium text-foreground">무대 구성 *</label>
            <div className="flex flex-wrap gap-2">
              {STAGE_TYPES.map((type) => {
                const checked = performanceInfo.stageTypes[0] === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setInfo("stageTypes", [type])}
                    className={[
                      "rounded-sm border px-3.5 py-2 text-[13px] font-medium transition-colors",
                      checked
                        ? "border-accent bg-accent-soft text-foreground"
                        : "border-border bg-panel text-muted hover:border-accent/50",
                    ].join(" ")}
                  >
                    {STAGE_TYPE_LABEL[type]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {hasSelection && (
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4 py-5">
            <label className="w-28 shrink-0 pt-2.5 text-[13px] font-medium text-foreground">예상 관객 규모 *</label>
            <div className="flex flex-wrap items-start gap-6">
              {primaryVenue === "arena" && (
                <div className="max-w-xs">
                  {isSimultaneous && (
                    <label className="mb-1.5 block text-[12.5px] font-medium text-muted">아레나</label>
                  )}
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={expectedAudience}
                    onChange={(e) => onChangeAudience(Math.max(0, Number(e.target.value) || 0))}
                    className="w-40 rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  <span className="ml-2 text-[13px] text-muted">명</span>
                  <p className="mt-1 text-[11px] text-muted">22,000명 초과 시 별도 문의가 필요할 수 있습니다.</p>
                </div>
              )}
              {(isSimultaneous || primaryVenue === "medium-hall") && (
                <div className="max-w-xs">
                  {isSimultaneous && (
                    <label className="mb-1.5 block text-[12.5px] font-medium text-muted">중형</label>
                  )}
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={secondaryAudience}
                    onChange={(e) => onChangeSecondaryAudience(Math.max(0, Number(e.target.value) || 0))}
                    className="w-40 rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  <span className="ml-2 text-[13px] text-muted">명</span>
                  <p className="mt-1 text-[11px] text-muted">3,000명 초과 시 별도 문의가 필요할 수 있습니다. 청소비 산출에만 사용됩니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {hasSelection && (
          <div className="space-y-5 py-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <label className="w-28 shrink-0 text-[13px] font-medium text-foreground">공연 유형 *</label>
              <select
                value={performanceInfo.eventTypes[0] ?? ""}
                onChange={(e) => setInfo("eventTypes", e.target.value ? [e.target.value as EventType] : [])}
                className="w-full max-w-xs rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="">선택하세요</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EVENT_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <label className="w-28 shrink-0 text-[13px] font-medium text-foreground">공연(행사)명 *</label>
              <input
                type="text"
                value={performanceInfo.eventName}
                onChange={(e) => setInfo("eventName", e.target.value)}
                placeholder="국문 필수 · 영문 선택 · '가제' 옵션 선택 가능"
                className="w-full max-w-md rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <label className="w-28 shrink-0 text-[13px] font-medium text-foreground">아티스트 / 출연진 *</label>
              <input
                type="text"
                value={performanceInfo.artist}
                onChange={(e) => setInfo("artist", e.target.value)}
                placeholder="아티스트명 · 국내/해외 구분 · 주요 출연진 추가 가능"
                className="w-full max-w-md rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
        )}
      </div>

      {hasSelection && (
        <div className="mt-5 rounded-sm border-l-2 border-accent bg-accent-soft/40 px-4 py-3 text-[12.5px] leading-5 text-foreground">
          공연명 · 출연진은 STEP 3 신청서와 자동 연동됩니다. 여기서 입력한 값은 신청서에 그대로
          채워지며, STEP 3에서 수정할 수 있습니다.
        </div>
      )}
    </section>
  );
}
