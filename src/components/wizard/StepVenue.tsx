"use client";

import { CHOICE_SELECTED_VARS, Note, choiceClass } from "@/components/ui/kit";
import { StepForm, StepHeading } from "./StepHeading";
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

/**
 * 공간 선택 — Figma Multi-step Forms 의 선택 칩 규격.
 * 선택 상태는 검정 채움 하나로만 표현한다. 옐로 좌측 바도, "선택됨" 배지도 쓰지 않는다.
 */
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
    <section>
      <StepHeading
        title={<>공간 선택</>}
        lead={
          <>
            시설 · 무대 구성 · 규모를 먼저 고르면 공간 정보에 맞는 예상 대관료 산정이
            시작됩니다. 대관 일정은 다음 화면에서 선택합니다.
          </>
        }
      />

      <StepForm>
        {/* 이용 시설 — 셋 중 하나만 고르는 배타적 선택. 선택 = 검정 채움 한 가지 언어. */}
        <fieldset>
          <legend className="text-s font-bold">이용 시설 *</legend>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {(
              [
                {
                  key: "arena",
                  label: "메인 아레나",
                  selected: primaryVenue === "arena" && !isSimultaneous,
                  onClick: () => onSelectVenue("arena", "SINGLE"),
                },
                {
                  key: "medium-hall",
                  label: "중형공연장",
                  selected: primaryVenue === "medium-hall" && !isSimultaneous,
                  onClick: () => onSelectVenue("medium-hall", "SINGLE"),
                },
                {
                  key: "simultaneous",
                  label: "동시 대관",
                  selected: isSimultaneous,
                  onClick: () => onSelectVenue("arena", "SIMULTANEOUS"),
                },
              ] as const
            ).map((opt) => (
              <li key={opt.key}>
                <button
                  type="button"
                  onClick={opt.onClick}
                  aria-pressed={opt.selected}
                  style={opt.selected ? CHOICE_SELECTED_VARS : undefined}
                  className={choiceClass(opt.selected)}
                >
                  <span className="type-kr-heading block text-h6-m">{opt.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <Note className="mt-4">
            동시 대관은 두 공간을 신청서 1건으로 묶어 신청하는 것이며, 두 공간은 완전히 분리되어
            있어 <b className="text-foreground">할인은 없습니다</b> — 금액은 각 공간을 따로
            신청했을 때와 같습니다.
          </Note>
        </fieldset>

        {primaryVenue === "arena" && (
          <fieldset className="mt-10 border-t border-border/25 pt-8">
            <legend className="text-s font-bold">무대 구성 *</legend>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {STAGE_TYPES.map((type) => {
                const selected = performanceInfo.stageTypes[0] === type;
                return (
                  <li key={type}>
                    <button
                      type="button"
                      onClick={() => setInfo("stageTypes", [type])}
                      aria-pressed={selected}
                      style={selected ? CHOICE_SELECTED_VARS : undefined}
                      className={choiceClass(selected)}
                    >
                      <span className="text-s font-bold">{STAGE_TYPE_LABEL[type]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        {hasSelection && (
          <fieldset className="mt-10 border-t border-border/25 pt-8">
            <legend className="text-s font-bold">예상 관객 규모 *</legend>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {primaryVenue === "arena" && (
                <div>
                  <label htmlFor="arena-audience" className="mb-1.5 block text-xs text-muted">
                    {isSimultaneous ? "아레나" : "관객 수"}
                  </label>
                  <div className="flex items-baseline gap-2">
                    <input
                      id="arena-audience"
                      type="number"
                      min={0}
                      step={500}
                      value={expectedAudience}
                      onChange={(e) => onChangeAudience(Math.max(0, Number(e.target.value) || 0))}
                      className="field-base w-40 text-right tabular-nums"
                    />
                    <span className="text-s text-muted">명</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    22,000명 초과 시 별도 문의가 필요할 수 있습니다.
                  </p>
                </div>
              )}
              {(isSimultaneous || primaryVenue === "medium-hall") && (
                <div>
                  <label htmlFor="midhall-audience" className="mb-1.5 block text-xs text-muted">
                    {isSimultaneous ? "중형" : "관객 수"}
                  </label>
                  <div className="flex items-baseline gap-2">
                    <input
                      id="midhall-audience"
                      type="number"
                      min={0}
                      step={100}
                      value={secondaryAudience}
                      onChange={(e) =>
                        onChangeSecondaryAudience(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="field-base w-40 text-right tabular-nums"
                    />
                    <span className="text-s text-muted">명</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    3,000명 초과 시 별도 문의가 필요할 수 있습니다. 청소비 산출에만 사용됩니다.
                  </p>
                </div>
              )}
            </div>
          </fieldset>
        )}

        {hasSelection && (
          <div className="mt-10 border-t border-border/25 pt-8">
            <div>
              <label htmlFor="event-type" className="mb-1.5 block text-s font-bold">
                공연 유형 *
              </label>
              <select
                id="event-type"
                value={performanceInfo.eventTypes[0] ?? ""}
                onChange={(e) =>
                  setInfo("eventTypes", e.target.value ? [e.target.value as EventType] : [])
                }
                className="field-base max-w-xs"
              >
                <option value="">선택하세요</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EVENT_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6">
              <label htmlFor="event-name" className="mb-1.5 block text-s font-bold">
                공연(행사)명 *
              </label>
              <input
                id="event-name"
                type="text"
                value={performanceInfo.eventName}
                onChange={(e) => setInfo("eventName", e.target.value)}
                placeholder="국문 필수 · 영문 선택 · '가제' 옵션 선택 가능"
                className="field-base"
              />
            </div>

            <div className="mt-6">
              <label htmlFor="event-artist" className="mb-1.5 block text-s font-bold">
                아티스트 / 출연진 *
              </label>
              <input
                id="event-artist"
                type="text"
                value={performanceInfo.artist}
                onChange={(e) => setInfo("artist", e.target.value)}
                placeholder="아티스트명 · 국내/해외 구분 · 주요 출연진 추가 가능"
                className="field-base"
              />
            </div>

            <Note className="mt-8">
              공연명 · 출연진은 신청서 제출 단계와 자동 연동됩니다. 여기서 입력한 값이 신청서에
              그대로 채워지며, 신청서에서 수정할 수 있습니다.
            </Note>
          </div>
        )}
      </StepForm>
    </section>
  );
}
