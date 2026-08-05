"use client";

import { VENUES, type RateTable } from "@/lib/pricing/types";

export function StepVenue({
  rateTable,
  venueId,
  onSelectVenue,
}: {
  rateTable: RateTable;
  venueId: string | null;
  onSelectVenue: (id: string) => void;
}) {
  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">1. 공간 선택</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        대관하실 공간을 먼저 선택하세요. 공간마다 대관 패키지와 요금 구성이
        다릅니다.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {VENUES.map((venue) => {
          const isSelected = venueId === venue.id;
          const hasPackages = rateTable.packages.some(
            (p) => (p.venueId ?? "arena") === venue.id,
          );
          return (
            <button
              key={venue.id}
              type="button"
              disabled={!hasPackages}
              onClick={() => onSelectVenue(venue.id)}
              className={[
                "relative flex flex-col rounded border p-6 text-left transition-colors",
                !hasPackages
                  ? "cursor-not-allowed border-border bg-panel/40 opacity-50"
                  : isSelected
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-panel hover:border-accent/50",
              ].join(" ")}
            >
              <div className="text-[16px] font-semibold">{venue.name}</div>
              {!hasPackages && (
                <div className="mt-2 text-[12px] text-muted">
                  요금 구성 준비 중입니다.
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
