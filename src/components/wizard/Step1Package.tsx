"use client";

import { won } from "@/lib/format";
import {
  packagePrice,
  packagesForVenue,
  recommendPackage,
} from "@/lib/pricing/rateTableUtils";
import { ARENA_MAX_AUDIENCE } from "@/lib/content/rateFacts";
import type { RateTable } from "@/lib/pricing/types";
import { CHOICE_SELECTED_VARS, choiceClass } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";

export function Step1Package({
  rateTable,
  venueId,
  packageId,
  expectedAudience,
  onSelectPackage,
  onChangeAudience,
}: {
  rateTable: RateTable;
  venueId: string;
  packageId: number | null;
  expectedAudience: number;
  onSelectPackage: (id: number) => void;
  onChangeAudience: (value: number) => void;
}) {
  const recommended = recommendPackage(rateTable, expectedAudience, venueId);
  const venuePackages = packagesForVenue(rateTable, venueId);
  const recommendedName = venuePackages.find((p) => p.id === recommended)?.name ?? "";
  const selected = venuePackages.find((p) => p.id === packageId);
  const overCapacity = expectedAudience > ARENA_MAX_AUDIENCE;
  const overSelected = !!selected && expectedAudience > selected.audienceTier.max;

  return (
    <section>
      <StepHeading
        title={<>공연 규모와 무대 형태를 선택해 주세요</>}
        lead={
          <>
            예상 관객 규모와 무대 형태에 따라 패키지가 정해집니다. 패키지마다 최대 수용인원과 권장
            무대·객석 형태가 다르고 대관료도 달라집니다. 선택하신 패키지는 심사 과정에서 공연
            계획과 맞는지 함께 검토합니다.
          </>
        }
      />

      <div className="mt-7 max-w-xs">
        <label htmlFor="expected-audience" className="mb-2 block text-xs font-bold">
          예상 관객 규모 (명)
        </label>
        <input
          id="expected-audience"
          type="number"
          min={1}
          max={ARENA_MAX_AUDIENCE}
          step={500}
          value={expectedAudience}
          onChange={(e) => onChangeAudience(Math.max(0, Number(e.target.value) || 0))}
          className="field-base tabular-nums"
        />
        {overCapacity && (
          <p className="mt-2 text-s text-danger">
            패키지 최대 수용인원은 약 {ARENA_MAX_AUDIENCE.toLocaleString()}명입니다. 이보다 큰
            규모는 1:1 문의로 상담해 주세요.
          </p>
        )}
        {!overCapacity && overSelected && (
          <p className="mt-2 text-s text-danger">
            입력하신 규모가 선택하신 패키지의 최대 수용인원을 넘습니다.
            {recommended ? ` 규모에 맞는 ${recommendedName}을(를) 확인해 주세요.` : ""}
          </p>
        )}
      </div>

      {/*
        선택 칩 규격(Figma Multi-step Forms). 선택 = 검정 채움 하나로만 표현하고,
        모든 카드는 같은 내부 구조·같은 순서로 정보를 담아 높이가 흔들리지 않게 한다.
      */}
      <ul className="mt-8 grid gap-3">
        {venuePackages.map((pkg) => {
          const isSelected = packageId === pkg.id;
          const isRecommended = recommended === pkg.id;
          return (
            <li key={pkg.id}>
              <button
                type="button"
                onClick={() => onSelectPackage(pkg.id)}
                aria-pressed={isSelected}
                style={isSelected ? CHOICE_SELECTED_VARS : undefined}
                className={choiceClass(isSelected)}
              >
                <span className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="type-kr-heading text-h6-m sm:text-h6">{pkg.name}</span>
                      <span className="text-s text-muted">{pkg.audienceTier.label}</span>
                      {isRecommended && (
                        <span className="type-display text-xs tracking-[0.08em]">추천</span>
                      )}
                    </span>
                    {pkg.tagline && <span className="mt-2 block text-s text-muted">{pkg.tagline}</span>}
                  </span>

                  <span className="shrink-0 sm:text-right">
                    <span className="type-display block text-h6-m tabular-nums sm:text-h6">
                      {won(packagePrice(rateTable, pkg))}
                    </span>
                    <span className="mt-1 block text-xs text-muted">/ 주 (화~일) · VAT 별도</span>
                  </span>
                </span>

                <span className="mt-5 block border-t border-border/40 pt-3">
                  <span className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted">
                    <span>
                      권장 무대 <b className="font-bold">{pkg.stageType}</b>
                    </span>
                    <span>
                      권장 객석 <b className="font-bold">{pkg.seatingType}</b>
                    </span>
                    <span>
                      관계자 주차 <b className="font-bold">{pkg.parkingPerDay}</b>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
