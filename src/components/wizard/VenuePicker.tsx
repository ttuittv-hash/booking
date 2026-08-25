"use client";

import type { BookingMode } from "@/lib/pricing/types";
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
function primaryVenueOf(venueId: string | null, bookingMode: BookingMode): "arena" | "medium-hall" | null {
  if (bookingMode === "SIMULTANEOUS") return "arena";
  if (!venueId) return null;
  return venueId === "medium-hall" ? "medium-hall" : "arena";
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
  const { t } = useWizardText();
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
              label: t("venuePicker.arenaOption", "메인 아레나"),
              active: primaryVenue === "arena" && !isSimultaneous,
              onClick: () => onSelectVenue("arena", "SINGLE"),
            },
            {
              key: "medium-hall",
              label: t("venuePicker.mediumHallOption", "중형공연장"),
              active: primaryVenue === "medium-hall" && !isSimultaneous,
              onClick: () => onSelectVenue("medium-hall", "SINGLE"),
            },
            {
              key: "simultaneous",
              label: t("venuePicker.simultaneousOption", "동시 대관"),
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
