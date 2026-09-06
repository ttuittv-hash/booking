"use client";

import { MID_HALL_VENUE_ID, SPECIAL_VENUE_ID, type BookingMode } from "@/lib/pricing/types";
import { defaultVenueName, venueLabelKey } from "@/lib/content/venueLabels";
import { useWizardText } from "@/lib/content/wizardText";

// [화면 뼈대 2026-08-19, 화면시나리오 STEP 1-1] 이용 시설은 "메인 아레나 / 중형공연장 /
// 동시 대관" 3개 중 하나만 고르는 토글 버튼이다 — 라디오+체크박스 조합(중복 체크로
// 오인되던 구조)이 아니라 셋이 동등한 배타적 선택지다. 동시 대관을 고르면 아레나가
// 기준(anchor)이 되므로 venueId는 항상 "arena"로 고정한다(일정 선택 화면의 "아레나를
// 먼저 확정한다" 흐름과 일치). venueId가 아직 null이면(첫 진입) 셋 다 비활성 상태로
// 보여준다.
// [개정 2026-08-20] 이 컴포넌트는 예전엔 "패키지 선택"이라는 독립 STEP(무대 구성·관객
// 규모·공연명 등도 함께 입력)이었다 — 이제 일정을 먼저 고르는 흐름으로 바뀌면서, 그
// 화면의 나머지 입력(관객 규모는 구성·옵션으로, 무대 구성·공연 유형·공연명·아티스트는
// 이미 신청자 정보 화면에도 동일하게 있어 그대로 남김)은 다른 화면으로 옮기거나 중복
// 제거했고, 여기는 "일정 선택" 화면 맨 위에 붙는 이용 시설 선택만 남았다.
// [개정 2026-09-02] 공간이 셋으로 늘었다. 예전에는 "중형이면 중형, 아니면 아레나"였는데,
// 그대로 두면 새로 추가한 공간이 아레나로 접혀 버려 자기 선택이 눌린 것으로 안 보인다.
// [개정 2026-09-06] "3번째 메뉴 동시대관 탭 하위에 아레나&중형, 올인원이 들어가야"
// — 예전엔 "동시 대관"·"패키지(→올인원 개명)"가 나란한 4번째 최상위 버튼이었는데,
// 이제 "동시 대관"을 고르면 그 아래 두 하위 선택지(아레나&중형 = 기존 SIMULTANEOUS,
// 올인원 = 기존 SPECIAL_VENUE_ID 단일 캘린더)가 펼쳐진다. 최상위는 아레나·중형공연장·
// 동시 대관 3개로 줄었다.
function primaryVenueOf(venueId: string | null, bookingMode: BookingMode): string | null {
  if (bookingMode === "SIMULTANEOUS") return "arena";
  return venueId;
}

export function VenuePicker({
  venueId,
  bookingMode,
  onSelectVenue,
}: {
  venueId: string | null;
  bookingMode: BookingMode;
  onSelectVenue: (venueId: string, bookingMode: BookingMode) => void;
}) {
  const { t, tStr } = useWizardText();
  const isSimultaneous = bookingMode === "SIMULTANEOUS";
  const isAllInOne = venueId === SPECIAL_VENUE_ID && bookingMode === "SINGLE";
  const isSimultaneousGroupActive = isSimultaneous || isAllInOne;
  const primaryVenue = primaryVenueOf(venueId, bookingMode);

  const topOptions = [
    {
      key: "arena",
      // 이름의 정본은 venue.<id>.name 이다(문구 관리 「공간 이름」). 예전 key 로
      // 이미 고쳐 둔 문구가 있으면 그걸 잃지 않도록 뒤로 물린다.
      label: tStr("venue.arena.name", tStr("venuePicker.arenaOption", "메인 아레나")),
      active: primaryVenue === "arena" && !isSimultaneousGroupActive,
      onClick: () => onSelectVenue("arena", "SINGLE"),
    },
    {
      key: MID_HALL_VENUE_ID,
      label: tStr(
        venueLabelKey(MID_HALL_VENUE_ID),
        tStr("venuePicker.mediumHallOption", defaultVenueName(MID_HALL_VENUE_ID)),
      ),
      active: primaryVenue === MID_HALL_VENUE_ID && !isSimultaneousGroupActive,
      onClick: () => onSelectVenue(MID_HALL_VENUE_ID, "SINGLE"),
    },
    {
      key: "simultaneous",
      label: tStr("venuePicker.simultaneousOption", "동시 대관"),
      active: isSimultaneousGroupActive,
      // 처음 누르면 하위 선택지 중 "아레나&중형"(기존 동시 대관 기본 동작)으로 들어간다.
      onClick: () => onSelectVenue("arena", "SIMULTANEOUS"),
    },
  ] as const;

  const subOptions = [
    {
      key: "arena-midhall",
      label: tStr("venuePicker.simultaneousSubArenaMidHall", "아레나&중형"),
      active: isSimultaneous,
      onClick: () => onSelectVenue("arena", "SIMULTANEOUS"),
    },
    {
      // [신규 2026-09-02, 2026-09-06 개명] "올인원" — 이름은 운영자가 문구 관리
      // 「공간 이름」에서 바꾼다(venue.special-hall.name, 예전 기본값 "패키지").
      key: "all-in-one",
      label: tStr(venueLabelKey(SPECIAL_VENUE_ID), defaultVenueName(SPECIAL_VENUE_ID)),
      active: isAllInOne,
      onClick: () => onSelectVenue(SPECIAL_VENUE_ID, "SINGLE"),
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-[7rem_1fr] sm:items-center">
      <label className="text-s font-bold text-foreground">{t("venuePicker.fieldLabel", "이용 시설")} *</label>
      <div>
        <div className="flex flex-wrap gap-2">
          {topOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={opt.onClick}
              className={[
                "flex h-10 items-center border px-4 text-s font-bold transition-colors",
                opt.active
                  ? "border-foreground bg-inverse-bg text-inverse-fg text-foreground"
                  : "border-border bg-panel text-muted hover:border-foreground/50",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* [수정 2026-09-06] "원뎁스 투뎁스 간격이 너무 좁아.. 투뎁스는 텍스트 밑줄
            느낌으로" — StepNav.tsx 하위 단계와 같은 규칙: 위와의 간격을 넉넉히(mt-2→
            mt-5) 띄우고, 알약(rounded-full·테두리)이 아니라 밑줄 텍스트로 바꾼다. */}
        {isSimultaneousGroupActive && (
          <div className="mt-5 flex flex-wrap items-center gap-4 border-l-2 border-border-soft pl-3">
            {subOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={opt.onClick}
                className={[
                  "flex h-8 items-center whitespace-nowrap text-xs font-bold outline-none underline-offset-4 transition-colors",
                  opt.active
                    ? "text-foreground underline decoration-2"
                    : "text-muted no-underline hover:text-foreground",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
