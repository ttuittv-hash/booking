"use client";

import { MID_HALL_VENUE_ID, type BookingMode } from "@/lib/pricing/types";
// [개정 2026-09-02] 세 번째 공간("패키지")은 여기 이용 시설 버튼에 두지 않는다 —
// 동시 대관을 고른 뒤 구성·옵션 화면의 탭으로만 보여 준다.
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
  const primaryVenue = primaryVenueOf(venueId, bookingMode);

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-[7rem_1fr] sm:items-center">
      <label className="text-s font-bold text-foreground">{t("venuePicker.fieldLabel", "이용 시설")} *</label>
      <div className="flex flex-wrap gap-2">
        {(
          [
            {
              key: "arena",
              // 이름의 정본은 venue.<id>.name 이다(문구 관리 「공간 이름」). 예전 key 로
              // 이미 고쳐 둔 문구가 있으면 그걸 잃지 않도록 뒤로 물린다.
              label: tStr("venue.arena.name", tStr("venuePicker.arenaOption", "메인 아레나")),
              active: primaryVenue === "arena" && !isSimultaneous,
              onClick: () => onSelectVenue("arena", "SINGLE"),
            },
            {
              key: MID_HALL_VENUE_ID,
              label: tStr(
                venueLabelKey(MID_HALL_VENUE_ID),
                tStr("venuePicker.mediumHallOption", defaultVenueName(MID_HALL_VENUE_ID)),
              ),
              active: primaryVenue === MID_HALL_VENUE_ID && !isSimultaneous,
              onClick: () => onSelectVenue(MID_HALL_VENUE_ID, "SINGLE"),
            },
            {
              key: "simultaneous",
              label: tStr("venuePicker.simultaneousOption", "동시 대관"),
              active: isSimultaneous,
              onClick: () => onSelectVenue("arena", "SIMULTANEOUS"),
            },
          ] as const
        ).map((opt) => (
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
    </div>
  );
}
