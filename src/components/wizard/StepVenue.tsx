"use client";

import { VENUES, type RateTable } from "@/lib/pricing/types";
import { Badge } from "@/components/ui/kit";

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
    <section>
      <h2 className="type-kr-heading text-h4-m sm:text-h4">공간 선택</h2>
      <p className="mt-3 max-w-2xl text-s text-muted">
        대관하실 공간을 먼저 선택하세요. 공간마다 대관 패키지와 요금 구성이 다릅니다.
      </p>

      {/* 선택 타일이 아니라 헤어라인 로우. 선택 상태는 옐로 좌측 바로 표시한다. */}
      <ul className="mt-8 border-t border-border/25">
        {VENUES.map((venue) => {
          const isSelected = venueId === venue.id;
          const hasPackages = rateTable.packages.some(
            (p) => (p.venueId ?? "arena") === venue.id,
          );
          return (
            <li key={venue.id} className="border-b border-border/25">
              <button
                type="button"
                disabled={!hasPackages}
                onClick={() => onSelectVenue(venue.id)}
                aria-pressed={isSelected}
                className={[
                  "flex w-full flex-col gap-2 border-l-4 py-6 pl-4 pr-1 text-left outline-none transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
                  "sm:flex-row sm:items-center sm:justify-between sm:gap-8",
                  !hasPackages
                    ? "cursor-not-allowed border-l-transparent opacity-40"
                    : isSelected
                      ? "border-l-accent bg-foreground/[0.04]"
                      : "border-l-transparent hover:bg-foreground/[0.03]",
                ].join(" ")}
              >
                <span className="type-kr-heading text-h6-m sm:text-h6">{venue.name}</span>
                {!hasPackages ? (
                  <span className="shrink-0 text-xs text-muted">요금 구성 준비 중입니다.</span>
                ) : (
                  isSelected && (
                    <span className="shrink-0">
                      <Badge tone="accent">선택됨</Badge>
                    </span>
                  )
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
