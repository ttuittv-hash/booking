"use client";

import { VENUES, type RateTable } from "@/lib/pricing/types";
import { CHOICE_SELECTED_VARS, choiceClass } from "@/components/ui/kit";

/**
 * 공간 선택 — Figma Multi-step Forms 의 선택 칩 규격.
 * 선택 상태는 검정 채움 하나로만 표현한다. 옐로 좌측 바도, "선택됨" 배지도 쓰지 않는다.
 */
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

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {VENUES.map((venue) => {
          const count = rateTable.packages.filter((p) => (p.venueId ?? "arena") === venue.id).length;
          const isSelected = venueId === venue.id;
          return (
            <li key={venue.id}>
              <button
                type="button"
                disabled={count === 0}
                onClick={() => onSelectVenue(venue.id)}
                aria-pressed={isSelected}
                style={isSelected ? CHOICE_SELECTED_VARS : undefined}
                className={choiceClass(isSelected, count === 0)}
              >
                <span className="type-kr-heading block text-h6-m sm:text-h6">{venue.name}</span>
                <span className="mt-2 block text-s text-muted">
                  {count > 0 ? `대관 패키지 ${count}종` : "요금 구성 준비 중입니다."}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
