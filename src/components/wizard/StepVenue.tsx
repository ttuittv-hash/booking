"use client";

import type { BookingMode, RateTable } from "@/lib/pricing/types";

type FacilityChoice = "arena" | "medium-hall" | "simultaneous";

const CHOICES: { id: FacilityChoice; name: string; desc: string }[] = [
  { id: "arena", name: "메인 아레나", desc: "주 단위 패키지 정찰제" },
  { id: "medium-hall", name: "중형공연장", desc: "일 단위 · 패키지 없음" },
  { id: "simultaneous", name: "동시 대관", desc: "아레나 + 중형을 신청서 1건으로" },
];

// [화면 뼈대 2026-08-18, 기능정의 2-13/0-2] 이용 시설은 라디오 1개로 통합한다 — 기존
// "○ 아레나 ○ 중형 ☑ 동시 대관"처럼 라디오·체크박스가 섞이면 상태가 모순된다.
function toChoice(venueId: string | null, bookingMode: BookingMode): FacilityChoice | null {
  if (!venueId) return null;
  if (bookingMode === "SIMULTANEOUS") return "simultaneous";
  return venueId === "medium-hall" ? "medium-hall" : "arena";
}

export function StepVenue({
  rateTable,
  venueId,
  bookingMode,
  expectedAudience,
  secondaryAudience,
  onSelectVenue,
  onChangeAudience,
  onChangeSecondaryAudience,
}: {
  rateTable: RateTable;
  venueId: string | null;
  bookingMode: BookingMode;
  expectedAudience: number;
  secondaryAudience: number;
  onSelectVenue: (venueId: string, bookingMode: BookingMode) => void;
  onChangeAudience: (value: number) => void;
  onChangeSecondaryAudience: (value: number) => void;
}) {
  const selected = toChoice(venueId, bookingMode);

  function pick(choice: FacilityChoice) {
    if (choice === "simultaneous") onSelectVenue("arena", "SIMULTANEOUS");
    else onSelectVenue(choice, "SINGLE");
  }

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">1. 이용 시설</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        대관하실 시설을 먼저 선택하세요. 동시 대관은 두 공간을 신청서 1건으로 묶어 신청하는
        것이며, 두 공간은 완전히 분리되어 있어 <b className="text-foreground">할인은 없습니다</b>
        — 금액은 각 공간을 따로 신청했을 때와 같습니다.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CHOICES.map((choice) => {
          const isSelected = selected === choice.id;
          const relevantVenueId = choice.id === "simultaneous" ? "arena" : choice.id;
          const hasPackages =
            choice.id === "medium-hall"
              ? true // 중형은 패키지가 없는 것이 정상이라 준비중 처리를 하지 않는다.
              : rateTable.packages.some((p) => (p.venueId ?? "arena") === relevantVenueId);
          return (
            <button
              key={choice.id}
              type="button"
              disabled={!hasPackages}
              onClick={() => pick(choice.id)}
              className={[
                "relative flex flex-col rounded border p-6 text-left transition-colors",
                !hasPackages
                  ? "cursor-not-allowed border-border bg-panel/40 opacity-50"
                  : isSelected
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-panel hover:border-accent/50",
              ].join(" ")}
            >
              <div className="text-[16px] font-semibold">{choice.name}</div>
              <div className="mt-1 text-[12px] text-muted">{choice.desc}</div>
              {!hasPackages && (
                <div className="mt-2 text-[12px] text-muted">요금 구성 준비 중입니다.</div>
              )}
            </button>
          );
        })}
      </div>

      {selected === "simultaneous" && (
        <div className="mt-6 rounded-sm bg-accent-soft px-4 py-3 text-[13px] leading-5 text-accent">
          두 공간을 함께 신청하시면 신청서 · 심사 · 계약이 한 건으로 진행됩니다. 각 공간의
          일정은 다음 화면에서 아레나부터 먼저 확정한 뒤 따로 선택합니다.
        </div>
      )}

      {selected && (
        <div className="mt-6 border-t border-border pt-6">
          <label className="mb-1.5 block text-[12.5px] font-medium text-muted">
            예상 관객 규모 {selected === "simultaneous" ? "— 아레나" : ""}
          </label>
          <div className="flex flex-wrap items-end gap-6">
            {selected !== "medium-hall" && (
              <div className="max-w-xs">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={expectedAudience}
                  onChange={(e) => onChangeAudience(Math.max(0, Number(e.target.value) || 0))}
                  className="w-40 rounded-sm border border-border bg-panel px-4 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <span className="ml-2 text-[13px] text-muted">명</span>
                <p className="mt-1 text-[11px] text-muted">22,000명 초과 시 별도 문의가 필요할 수 있습니다.</p>
              </div>
            )}
            {(selected === "simultaneous" || selected === "medium-hall") && (
              <div className="max-w-xs">
                {selected === "simultaneous" && (
                  <label className="mb-1.5 block text-[12.5px] font-medium text-muted">예상 관객 규모 — 중형</label>
                )}
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={secondaryAudience}
                  onChange={(e) => onChangeSecondaryAudience(Math.max(0, Number(e.target.value) || 0))}
                  className="w-40 rounded-sm border border-border bg-panel px-4 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <span className="ml-2 text-[13px] text-muted">명</span>
                <p className="mt-1 text-[11px] text-muted">3,000명 초과 시 별도 문의가 필요할 수 있습니다. 청소비 산출에만 사용됩니다.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
