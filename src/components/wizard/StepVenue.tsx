"use client";

import { VENUES, type RateTable } from "@/lib/pricing/types";
import { CHOICE_SELECTED_VARS, choiceClass } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";

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
      <StepHeading
        title={<>어느 공간을 대관하시나요?</>}
        lead={
          <>
            선택하신 공간에 따라 이후 신청 절차가 달라집니다. 아레나는 셋업 4일과 공연 2일을 합한
            6일 단위로 신청하고 패키지 가운데 선택하십니다. 중형공연장은 희망 일자를 직접 고르고
            일자별로 셋업일과 공연일을 지정하십니다.
          </>
        }
      />

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
                <span className="mt-2 block break-keep text-s text-muted">
                  {venue.id === "arena"
                    ? "객석 구성 10,000~17,000명, 스탠딩 구성 12,000~22,500명 규모의 공연에 적합합니다. 6일 단위 · 패키지 4종 · 총 8단계"
                    : "좌석 구성 2,000~2,500명, 스탠딩 구성 3,500명까지 수용합니다. 일수 기준 · 부대시설 개별 신청 · 총 7단계"}
                </span>
                {count === 0 && (
                  <span className="mt-3 block text-xs text-muted">
                    일수 기준 신청은 준비 중입니다. 그 전까지는 1:1 문의로 상담해 주세요.
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
